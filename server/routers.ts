import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { hashPassword, verifyPassword, parseTriggerDate } from "./utils";
import { TRPCError } from "@trpc/server";
import { processMoment } from "./rules-engine";
import { computeFunnelStage, groupThreadsByStage, computeVelocity } from "./funnel";
import { calculateEngagementScore, getScoreBreakdown } from "./scoring";
import { scoreContact } from "./lead-scoring";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    
    signup: publicProcedure
      .input(z.object({
        tenantName: z.string(),
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Create tenant
        const tenant = await db.createTenant({ name: input.tenantName });
        
        // Create owner user
        const user = await db.createUser({
          tenantId: tenant.id,
          email: input.email,
          passwordHash: hashPassword(input.password),
          name: input.name,
          role: "owner",
        });
        
        return { success: true, userId: user.id, tenantId: tenant.id };
      }),
    
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
        tenantId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // For now, we'll need tenant ID to be provided
        // In a real app, you might look up by email across tenants or use domain
        if (!input.tenantId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" });
        }
        
        const user = await db.getUserByEmail(input.tenantId, input.email);
        if (!user || !verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        }
        
        return { success: true, user };
      }),
  }),
  
  home: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const tenantId = ctx.user.tenantId;
      
      // Get today's actions
      const todayActions = await db.getOpenActionsByTenant(tenantId);
      
      // Get recently touched threads
      const people = await db.getPeopleByTenant(tenantId);
      
      return {
        todayActions: todayActions.slice(0, 7),
        waitingOn: todayActions.filter(a => a.actionType === "follow_up"),
        recentlyTouched: people.slice(0, 10),
      };
    }),
  }),
  
  people: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getPeopleByTenant(ctx.user.tenantId);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input, ctx }) => {
        const person = await db.getPersonById(input.id);
        if (!person || person.tenantId !== ctx.user.tenantId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        const threads = await db.getThreadsByPerson(ctx.user.tenantId, input.id);
        
        // Get all moments for this person's threads for email timeline
        const threadsWithMoments = await Promise.all(
          threads.map(async (thread) => {
            const moments = await db.getMomentsByThread(ctx.user.tenantId, thread.id);
            return { ...thread, moments };
          })
        );
        
        return { person, threads: threadsWithMoments };
      }),
    
    create: protectedProcedure
      .input(z.object({
        fullName: z.string(),
        primaryEmail: z.string().email(),
        companyName: z.string().optional(),
        roleTitle: z.string().optional(),
        phone: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createPerson({
          tenantId: ctx.user.tenantId,
          ...input,
        });
      }),
    
    updateScore: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonById(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        // Get moments for this person to calculate engagement
        const threads = await db.getThreadsByPerson(ctx.user.tenantId, input.personId);
        let emailOpens = person.numberOfOpens || 0;
        let emailReplies = person.replied ? 1 : 0;
        let linkClicks = 0;
        let lastActivityDate: Date | undefined;

        for (const thread of threads) {
          const moments = await db.getMomentsByThread(ctx.user.tenantId, thread.id);
          for (const moment of moments) {
            if (moment.type === "email_sent") emailOpens++;
            if (moment.type === "reply_received") emailReplies++;
            // Link clicks tracked in metadata
            if (moment.timestamp && (!lastActivityDate || moment.timestamp > lastActivityDate)) {
              lastActivityDate = moment.timestamp;
            }
          }
        }

        const score = calculateEngagementScore({
          emailOpens,
          emailReplies,
          meetingsBooked: person.meetingBooked ? 1 : 0,
          linkClicks,
          lastActivityDate,
        });

        // Update person's score
        await db.updatePerson(input.personId, { engagementScore: score });

        return { score };
      }),
    
    getScoreBreakdown: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input, ctx }) => {
        const person = await db.getPersonById(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        // Get moments for this person to calculate engagement
        const threads = await db.getThreadsByPerson(ctx.user.tenantId, input.personId);
        let emailOpens = person.numberOfOpens || 0;
        let emailReplies = person.replied ? 1 : 0;
        let linkClicks = 0;
        let lastActivityDate: Date | undefined;

        for (const thread of threads) {
          const moments = await db.getMomentsByThread(ctx.user.tenantId, thread.id);
          for (const moment of moments) {
            if (moment.type === "email_sent") emailOpens++;
            if (moment.type === "reply_received") emailReplies++;
            // Link clicks tracked in metadata
            if (moment.timestamp && (!lastActivityDate || moment.timestamp > lastActivityDate)) {
              lastActivityDate = moment.timestamp;
            }
          }
        }

        return getScoreBreakdown({
          emailOpens,
          emailReplies,
          meetingsBooked: person.meetingBooked ? 1 : 0,
          linkClicks,
          lastActivityDate,
        });
      }),
    
    calculateLeadScore: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonById(input.personId);
        if (!person || person.tenantId !== ctx.user.tenantId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        // Get account if exists
        let account = null;
        if (person.companyDomain) {
          const accounts = await db.getAccountsByTenant(ctx.user.tenantId);
          account = accounts.find(a => a.domain === person.companyDomain) || null;
        }
        
        // Calculate scores (no event tracking yet, so intent score will be 0)
        const scores = await scoreContact(person, account, []);
        
        // Update person with scores
        await db.updatePerson(input.personId, {
          fitScore: scores.fitScore,
          intentScore: scores.intentScore,
          combinedScore: scores.combinedScore,
          fitTier: scores.fitTier,
          intentTier: scores.intentTier,
          scoreReasons: scores.scoreReasons,
        });
        
        return scores;
      }),
    
    bulkCalculateScores: protectedProcedure
      .mutation(async ({ ctx }) => {
        const people = await db.getPeopleByTenant(ctx.user.tenantId);
        const accounts = await db.getAccountsByTenant(ctx.user.tenantId);
        
        let scored = 0;
        for (const person of people) {
          try {
            // Get account if exists
            let account = null;
            if (person.companyDomain) {
              account = accounts.find(a => a.domain === person.companyDomain) || null;
            }
            
            // Calculate scores (no event tracking yet, so intent score will be 0)
            const scores = await scoreContact(person, account, []);
            
            // Update person with scores
            await db.updatePerson(person.id, {
              fitScore: scores.fitScore,
              intentScore: scores.intentScore,
              combinedScore: scores.combinedScore,
              fitTier: scores.fitTier,
              intentTier: scores.intentTier,
              scoreReasons: scores.scoreReasons,
            });
            
            scored++;
          } catch (error) {
            console.error(`Failed to score person ${person.id}:`, error);
          }
        }
        
        return { scored, total: people.length };
      }),
    
    bulkImport: protectedProcedure
      .input(z.object({
        contacts: z.array(z.object({
          fullName: z.string(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          primaryEmail: z.string().email(),
          companyName: z.string().optional(),
          roleTitle: z.string().optional(),
          phone: z.string().optional(),
          linkedinUrl: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const tenantId = ctx.user.tenantId;
        let success = 0;
        let failed = 0;
        let duplicates = 0;
        const errors: string[] = [];
        
        // Get existing emails to check for duplicates
        const existingPeople = await db.getPeopleByTenant(tenantId);
        const existingEmails = new Set(existingPeople.map(p => p.primaryEmail.toLowerCase()));
        
        for (const contact of input.contacts) {
          try {
            // Check for duplicate
            if (existingEmails.has(contact.primaryEmail.toLowerCase())) {
              duplicates++;
              continue;
            }
            
            // Create person
            await db.createPerson({
              tenantId,
              fullName: contact.fullName,
              firstName: contact.firstName,
              lastName: contact.lastName,
              primaryEmail: contact.primaryEmail,
              companyName: contact.companyName,
              roleTitle: contact.roleTitle,
              phone: contact.phone,
              linkedinUrl: contact.linkedinUrl,
              city: contact.city,
              state: contact.state,
              country: contact.country,
            });
            
            existingEmails.add(contact.primaryEmail.toLowerCase());
            success++;
          } catch (error: any) {
            failed++;
            errors.push(`${contact.primaryEmail}: ${error.message}`);
          }
        }
        
        return { success, failed, duplicates, errors };
      }),
  }),
  
  threads: router({
    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input, ctx }) => {
        const thread = await db.getThreadById(input.id);
        if (!thread || thread.tenantId !== ctx.user.tenantId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        const moments = await db.getMomentsByThread(ctx.user.tenantId, input.id);
        const nextAction = await db.getOpenActionForThread(ctx.user.tenantId, input.id);
        
        return { thread, moments, nextAction };
      }),
    
    create: protectedProcedure
      .input(z.object({
        personId: z.string(),
        source: z.string(),
        intent: z.string(),
        title: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createThread({
          tenantId: ctx.user.tenantId,
          ...input,
        });
      }),
    
    assign: protectedProcedure
      .input(z.object({
        threadId: z.string(),
        ownerUserId: z.number().optional(),
        collaboratorUserIds: z.array(z.number()).optional(),
        visibility: z.enum(["private", "shared", "restricted"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateThread(ctx.user.tenantId, input.threadId, {
          ownerUserId: input.ownerUserId,
          collaboratorUserIds: input.collaboratorUserIds,
          visibility: input.visibility,
        });
        return { success: true };
      }),
    
    updateStatus: protectedProcedure
      .input(z.object({
        threadId: z.string(),
        status: z.enum(["active", "waiting", "dormant", "closed"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateThread(ctx.user.tenantId, input.threadId, {
          status: input.status,
        });
        return { success: true };
      }),
  }),
  
  moments: router({
    create: protectedProcedure
      .input(z.object({
        threadId: z.string(),
        personId: z.string(),
        type: z.enum(["note_added"]),
        content: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const moment = await db.createMoment({
          tenantId: ctx.user.tenantId,
          threadId: input.threadId,
          personId: input.personId,
          source: "manual",
          type: input.type,
          timestamp: new Date(),
          metadata: { content: input.content },
        });
        
        // Process through rules engine
        await processMoment(moment);
        
        return moment;
      }),
  }),
  
  actions: router({
    create: protectedProcedure
      .input(z.object({
        threadId: z.string(),
        actionType: z.string(),
        triggerType: z.string(),
        triggerValue: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Close existing open actions for this thread
        await db.closeOpenActionsForThread(ctx.user.tenantId, input.threadId);
        
        return db.createNextAction({
          tenantId: ctx.user.tenantId,
          ...input,
        });
      }),
    
    complete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.completeNextAction(input.id);
        return { success: true };
      }),
  }),
  
  events: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getEventsByTenant(ctx.user.tenantId);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input, ctx }) => {
        const events = await db.getEventsByTenant(ctx.user.tenantId);
        const event = events.find(e => e.id === input.id);
        if (!event) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return event;
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        slug: z.string(),
        startsAt: z.date().optional(),
        endsAt: z.date().optional(),
        defaultIntent: z.string().optional(),
        defaultTags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createEvent({
          tenantId: ctx.user.tenantId,
          ...input,
        });
      }),
    
    // Public endpoint for lead capture form
    getPublic: publicProcedure
      .input(z.object({ slug: z.string(), tenantId: z.string() }))
      .query(async ({ input }) => {
        const event = await db.getEventBySlug(input.tenantId, input.slug);
        if (!event) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return event;
      }),
    
    submitLead: publicProcedure
      .input(z.object({
        slug: z.string(),
        tenantId: z.string(),
        formData: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input }) => {
        const event = await db.getEventBySlug(input.tenantId, input.slug);
        if (!event) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        // Extract person data from form
        const { full_name, email, company_name, role_title, phone, notes, ...rest } = input.formData;
        
        if (!email || !full_name) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Name and email required" });
        }
        
        // Upsert person
        const person = await db.upsertPerson(input.tenantId, email as string, {
          fullName: full_name as string,
          companyName: company_name as string | undefined,
          roleTitle: role_title as string | undefined,
          phone: phone as string | undefined,
          tags: [...(event.defaultTags || [])],
        });
        
        // Create or find thread
        const existingThreads = await db.getThreadsByPerson(input.tenantId, person.id);
        const eventThread = existingThreads.find(t => t.title === `Event: ${event.name}`);
        
        const thread = eventThread || await db.createThread({
          tenantId: input.tenantId,
          personId: person.id,
          source: "manual",
          intent: event.defaultIntent,
          title: `Event: ${event.name}`,
        });
        
        // Create moment
        await db.createMoment({
          tenantId: input.tenantId,
          threadId: thread.id,
          personId: person.id,
          source: "manual",
          type: "lead_captured",
          timestamp: new Date(),
          metadata: { eventId: event.id, notes, ...rest },
        });
        
        // Create next action
        await db.createNextAction({
          tenantId: input.tenantId,
          threadId: thread.id,
          actionType: "follow_up",
          triggerType: "date",
          triggerValue: "now+1d",
        });
        
        return { success: true };
      }),
  }),
  
  funnel: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const threads = await db.getThreadsByTenant(ctx.user.tenantId);
      const threadsWithData = await Promise.all(
        threads.map(async (thread) => {
          const moments = await db.getMomentsByThread(ctx.user.tenantId, thread.id);
          const nextActions = await db.getNextActionsByThread(ctx.user.tenantId, thread.id);
          return { thread, moments, nextActions };
        })
      );
      
      const grouped = groupThreadsByStage(threadsWithData);
      
      // Enrich with person data
      const stages = await Promise.all(
        Object.entries(grouped).map(async ([stageKey, threads]) => {
          const enrichedThreads = await Promise.all(
            threads.map(async (t) => {
              const person = await db.getPersonById(t.personId);
              const openAction = t.nextActions.find(a => a.status === 'open');
              return {
                thread_id: t.id,
                person: person ? {
                  full_name: person.fullName,
                  primary_email: person.primaryEmail,
                  company_name: person.companyName,
                } : null,
                owner_user_id: t.ownerUserId,
                visibility: t.visibility,
                last_activity_at: t.lastActivityAt,
                next_action: openAction ? {
                  action_id: openAction.id,
                  action_type: openAction.actionType,
                  status: openAction.status,
                  assigned_user_id: openAction.assignedUserId,
                  due_at: openAction.dueAt,
                } : null,
                funnel_stage: t.funnelStage,
              };
            })
          );
          return { stage_key: stageKey, threads: enrichedThreads };
        })
      );
      
      return { stages };
    }),
  }),
  
  analytics: router({
    get: protectedProcedure
      .input(z.object({
        timeRange: z.enum(["last_4_weeks", "last_8_weeks", "last_12_weeks"]).default("last_8_weeks"),
      }))
      .query(async ({ input, ctx }) => {
        const weeksAgo = input.timeRange === "last_4_weeks" ? 4 : input.timeRange === "last_8_weeks" ? 8 : 12;
        const startDate = new Date(Date.now() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
        
        const moments = await db.getMomentsByTenant(ctx.user.tenantId);
        const recentMoments = moments.filter(m => new Date(m.timestamp) >= startDate);
        
        // Activity by week
        const activityByWeek: Array<{
          week_start: string;
          email_sent: number;
          reply_received: number;
          meeting_held: number;
          lead_captured: number;
        }> = [];
        
        for (let i = 0; i < weeksAgo; i++) {
          const weekStart = new Date(Date.now() - (weeksAgo - i) * 7 * 24 * 60 * 60 * 1000);
          const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
          
          const weekMoments = recentMoments.filter(
            m => new Date(m.timestamp) >= weekStart && new Date(m.timestamp) < weekEnd
          );
          
          activityByWeek.push({
            week_start: weekStart.toISOString().split('T')[0]!,
            email_sent: weekMoments.filter(m => m.type === 'email_sent').length,
            reply_received: weekMoments.filter(m => m.type === 'reply_received').length,
            meeting_held: weekMoments.filter(m => m.type === 'meeting_held').length,
            lead_captured: weekMoments.filter(m => m.type === 'lead_captured').length,
          });
        }
        
        // Engagement rates
        const emailsSent = recentMoments.filter(m => m.type === 'email_sent').length;
        const repliesReceived = recentMoments.filter(m => m.type === 'reply_received').length;
        const meetingsHeld = recentMoments.filter(m => m.type === 'meeting_held').length;
        
        const engagement = {
          replies_per_email_sent: emailsSent > 0 ? repliesReceived / emailsSent : 0,
          meetings_per_reply: repliesReceived > 0 ? meetingsHeld / repliesReceived : 0,
        };
        
        // Funnel health
        const threads = await db.getThreadsByTenant(ctx.user.tenantId);
        const threadsWithData = await Promise.all(
          threads.map(async (thread) => {
            const threadMoments = await db.getMomentsByThread(ctx.user.tenantId, thread.id);
            const nextActions = await db.getNextActionsByThread(ctx.user.tenantId, thread.id);
            return { thread, moments: threadMoments, nextActions };
          })
        );
        
        const grouped = groupThreadsByStage(threadsWithData);
        const funnelHealth = {
          counts_by_stage: Object.entries(grouped).map(([key, threads]) => ({
            stage_key: key,
            count: threads.length,
          })),
        };
        
        // Follow-up discipline
        const allActions = await db.getNextActionsByTenant(ctx.user.tenantId);
        const overdueActions = allActions.filter(
          a => a.status === 'open' && a.dueAt && new Date(a.dueAt) < new Date()
        );
        
        const completedActions = allActions.filter(a => a.status === 'completed' && a.completedAt);
        const avgHours = completedActions.length > 0
          ? completedActions.reduce((sum, a) => {
              const hours = (new Date(a.completedAt!).getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60);
              return sum + hours;
            }, 0) / completedActions.length
          : 0;
        
        const followUpDiscipline = {
          overdue_open_actions: overdueActions.length,
          avg_hours_to_complete_action: avgHours,
        };
        
        // Velocity
        const velocity = computeVelocity(moments);
        
        return {
          activity: { by_week: activityByWeek },
          engagement,
          funnel_health: funnelHealth,
          follow_up_discipline: followUpDiscipline,
          velocity,
        };
      }),
  }),
  
  assistant: router({
    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const { queryAIAssistant } = await import("./aiAssistant");
        const response = await queryAIAssistant({
          tenantId: parseInt(ctx.user.tenantId),
          userId: parseInt(ctx.user.id),
          messages: input.messages,
        });
        return { response };
      }),
  }),
  
  amplemarket: router({ getAccountById: protectedProcedure
      .input(z.object({ accountId: z.string() }))
      .query(async ({ input, ctx }) => {
        const accounts = await db.getAccountsByTenant(ctx.user.tenantId);
        return accounts.find((a: any) => a.id === input.accountId) || null;
      }),
    
    getContactsByAccount: protectedProcedure
      .input(z.object({ accountId: z.string() }))
      .query(async ({ input, ctx }) => {
        const people = await db.getPeopleByTenant(ctx.user.tenantId);
        return people.filter((p: any) => p.accountId === input.accountId);
      }),
  }),
  
  automation: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Return empty array for now - rules are hardcoded in UI
      return [];
    }),
    
    toggle: protectedProcedure
      .input(z.object({
        ruleId: z.string(),
        status: z.enum(["active", "paused"]),
      }))
      .mutation(async ({ input, ctx }) => {
        // For now, just return success
        // In a real implementation, this would update the rule in the database
        return { success: true };
      }),
  }),
  
  sequences: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const sequences = await db.getEmailSequencesByTenant(ctx.user.tenantId);
      
      // Get step counts and enrollment counts for each sequence
      const sequencesWithStats = await Promise.all(
        sequences.map(async (seq) => {
          const steps = await db.getEmailSequenceSteps(seq.id);
          const enrollments = await db.getEmailSequenceEnrollments(ctx.user.tenantId, seq.id);
          
          return {
            id: seq.id,
            name: seq.name,
            description: seq.description,
            status: seq.status,
            stepCount: steps.length,
            enrolledCount: enrollments.filter(e => e.status === "active").length,
            openRate: 0, // TODO: Calculate from email events
            replyRate: 0, // TODO: Calculate from email events
            createdAt: seq.createdAt,
          };
        })
      );
      
      return sequencesWithStats;
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input, ctx }) => {
        const sequence = await db.getEmailSequenceById(input.id);
        if (!sequence || sequence.tenantId !== ctx.user.tenantId) {
          return null;
        }
        
        const steps = await db.getEmailSequenceSteps(sequence.id);
        return { ...sequence, steps };
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        steps: z.array(z.object({
          type: z.enum(["email", "wait", "condition"]),
          subject: z.string().optional(),
          body: z.string().optional(),
          waitDays: z.number().optional(),
          condition: z.object({
            type: z.enum(["opened", "replied", "clicked"]),
          }).optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        // Create the sequence
        const sequence = await db.createEmailSequence(ctx.user.tenantId, {
          name: input.name,
          description: input.description,
          status: "active",
        });
        
        // Create the steps (only email steps for now)
        const emailSteps = input.steps.filter(s => s.type === "email" && s.subject && s.body);
        for (let i = 0; i < emailSteps.length; i++) {
          const step = emailSteps[i];
          await db.createEmailSequenceStep(sequence.id, {
            stepNumber: i + 1,
            subject: step.subject!,
            body: step.body!,
            delayDays: step.waitDays || 0,
          });
        }
        
        return { success: true, id: sequence.id };
      }),
  }),
  
  emailGenerator: router({
    listExamples: protectedProcedure.query(async ({ ctx }) => {
      // Return stored examples (would be in database in production)
      return [];
    }),
    
    getStylePreferences: protectedProcedure.query(async ({ ctx }) => {
      // Return style preferences (would be in database in production)
      return { tone: "professional", length: "medium" };
    }),
    
    createExample: protectedProcedure
      .input(z.object({
        subject: z.string(),
        body: z.string(),
        context: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Store example (would be in database in production)
        return { success: true, id: `example-${Date.now()}` };
      }),
    
    deleteExample: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // Delete example (would be in database in production)
        return { success: true };
      }),
    
    updateStylePreferences: protectedProcedure
      .input(z.object({
        tone: z.string().optional(),
        length: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Update style preferences (would be in database in production)
        return { success: true };
      }),
    
    generate: protectedProcedure
      .input(z.object({
        context: z.string(),
        contactInfo: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Generate email using LLM
        const prompt = `You are an email writing assistant. Generate a professional email based on the following context:

Context: ${input.context}
${input.contactInfo ? `\nContact Information: ${input.contactInfo}` : ""}

Generate a subject line and email body. Format your response as JSON with "subject" and "body" fields.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional email writing assistant. Always respond with valid JSON containing 'subject' and 'body' fields." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "email_response",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  subject: { type: "string", description: "Email subject line" },
                  body: { type: "string", description: "Email body content" },
                },
                required: ["subject", "body"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate email" });
        }

        const result = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
        return { subject: result.subject, body: result.body };
      }),
  }),
  
  activities: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Get all moments for this tenant and format as activities
      const moments = await db.getMomentsByTenant(ctx.user.tenantId);
      
      // Enrich with person information
      const activities = await Promise.all(
        moments.map(async (moment) => {
          const person = await db.getPersonById(moment.personId);
          return {
            id: moment.id,
            type: moment.type,
            timestamp: moment.timestamp,
            personId: moment.personId,
            personName: person?.fullName,
            description: moment.source,
            metadata: moment.metadata,
          };
        })
      );
      
      // Sort by timestamp descending
      return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }),
  }),
  
  customFields: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Return empty array for now - fields are hardcoded in UI
      return [];
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        label: z.string(),
        type: z.enum(["text", "number", "date", "dropdown"]),
        entity: z.enum(["contact", "company"]),
        options: z.array(z.string()).optional(),
        required: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Placeholder for creating a custom field
        return { success: true, id: `field-${Date.now()}` };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // Placeholder for deleting a custom field
        return { success: true };
      }),
  }),
  
  integrations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getIntegrationsByTenant(ctx.user.tenantId);
    }),
    
    connectGoogle: protectedProcedure.mutation(async ({ ctx }) => {
      // Placeholder for Google OAuth flow
      // TODO: Implement Google OAuth flow
      throw new TRPCError({ code: "NOT_IMPLEMENTED", message: "Google OAuth not yet implemented" });
    }),
    
    connectAmplemarket: protectedProcedure
      .input(z.object({ apiKey: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await db.upsertIntegration(ctx.user.tenantId, "amplemarket", {
          status: "connected",
          config: { apiKey: input.apiKey },
        });
        return { success: true };
      }),
    
    syncAmplemarket: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { syncAmplemarket } = await import("./amplemarket");
        const integrations = await db.getIntegrationsByTenant(ctx.user.tenantId);
        const amplemarketIntegration = integrations.find((i: any) => i.provider === "amplemarket");
        if (!amplemarketIntegration || amplemarketIntegration.status !== "connected") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Amplemarket not connected" });
        }
        const apiKey = (amplemarketIntegration.config as any)?.apiKey;
        if (!apiKey) throw new TRPCError({ code: "BAD_REQUEST", message: "Amplemarket API key not found" });
        const dbInstance = await db.getDb();
        return syncAmplemarket(dbInstance, ctx.user.tenantId, apiKey);
      }),
    
    listAmplemarketAccounts: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getAccountsBySource(ctx.user.tenantId, "amplemarket");
      }),
    
    listAmplemarketPeople: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getPeopleBySource(ctx.user.tenantId, "amplemarket");
      }),
    
    connectApollo: protectedProcedure
      .input(z.object({ apiKey: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { connectApollo } = await import("./apollo");
        return connectApollo(ctx.user.tenantId, input.apiKey);
      }),
    
    syncApolloContacts: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { syncApolloContacts } = await import("./apollo");
        return syncApolloContacts(ctx.user.tenantId);
      }),
    
    enrichPersonWithApollo: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { enrichPersonWithApollo } = await import("./apollo");
        return enrichPersonWithApollo(ctx.user.tenantId, input.personId);
      }),
    
    syncApolloEngagements: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { syncApolloEngagements } = await import("./apollo");
        return syncApolloEngagements(ctx.user.tenantId, ctx.user.id);
      }),
  }),
  
  tracking: router({
    trackEvent: protectedProcedure
      .input(z.object({
        personId: z.string().optional(),
        accountId: z.string().optional(),
        eventType: z.enum([
          "email_sent",
          "email_opened",
          "email_clicked",
          "email_replied",
          "page_view",
          "demo_request",
          "pricing_view",
          "content_download",
          "webinar_registration",
          "trial_started"
        ]),
        eventData: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const event = await db.createTrackingEvent(ctx.user.tenantId, {
          personId: input.personId,
          accountId: input.accountId,
          eventType: input.eventType,
          eventData: input.eventData,
        });
        
        // If this is a person event, recalculate their intent score
        if (input.personId) {
          const person = await db.getPersonById(input.personId);
          if (person && person.tenantId === ctx.user.tenantId) {
            const events = await db.getTrackingEventsByPerson(ctx.user.tenantId, input.personId);
            const account = person.accountId ? await db.getAccountById(person.accountId) : null;
            const { scoreContact } = await import("./lead-scoring");
            
            // Convert tracking events to scoring format
            const scoringEvents = events.map(e => ({
              type: e.eventType,
              timestamp: new Date(e.timestamp),
            }));
            
            const scores = await scoreContact(person, account, scoringEvents);
            
            // Update person with new scores
            await db.upsertPerson(ctx.user.tenantId, person.primaryEmail, {
              intentScore: scores.intentScore,
              intentTier: scores.intentTier,
              combinedScore: scores.combinedScore,
              scoreReasons: scores.scoreReasons,
            });
          }
        }
        
        return { success: true, eventId: event.id };
      }),
    
    getEventsByPerson: protectedProcedure
      .input(z.object({
        personId: z.string(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const events = await db.getTrackingEventsByPerson(
          ctx.user.tenantId,
          input.personId,
          input.limit
        );
        return events;
      }),
    
    getEventsByAccount: protectedProcedure
      .input(z.object({
        accountId: z.string(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const events = await db.getTrackingEventsByAccount(
          ctx.user.tenantId,
          input.accountId,
          input.limit
        );
        return events;
      }),
  }),

  // Chat router
  chat: router({
    getChannels: protectedProcedure
      .query(async ({ ctx }) => {
        const channels = await db.getChannelsByTenant(ctx.user.tenantId);
        return channels;
      }),
    
    createChannel: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(["public", "private"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const { randomUUID } = await import("crypto");
        const channelId = randomUUID();
        
        const channel = await db.createChannel({
          id: channelId,
          tenantId: ctx.user.tenantId,
          name: input.name,
          description: input.description,
          type: input.type,
          createdBy: ctx.user.id,
        });
        
        // Add creator as admin member
        await db.addChannelMember({
          id: randomUUID(),
          channelId,
          userId: ctx.user.id,
          role: "admin",
        });
        
        // Add AI assistant as a member to learn from conversations
        const aiAssistantId = "ai-assistant-bot";
        await db.addChannelMember({
          id: randomUUID(),
          channelId,
          userId: aiAssistantId,
          role: "member",
        });
        
        return channel;
      }),
    
    getMessages: protectedProcedure
      .input(z.object({
        channelId: z.string(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const messages = await db.getMessagesByChannel(input.channelId, input.limit);
        return messages;
      }),
    
    sendMessage: protectedProcedure
      .input(z.object({
        channelId: z.string(),
        content: z.string().min(1),
        threadId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { randomUUID } = await import("crypto");
        const message = await db.createMessage({
          id: randomUUID(),
          tenantId: ctx.user.tenantId,
          channelId: input.channelId,
          userId: ctx.user.id,
          content: input.content,
          threadId: input.threadId,
        });
        
        // Check if AI assistant was mentioned
        if (input.content.includes("@ai") || input.content.includes("@assistant")) {
          // Get recent messages for context
          const recentMessages = await db.getMessagesByChannel(input.channelId, 10);
          const context = recentMessages
            .map(m => `${m.user?.name || "User"}: ${m.content}`)
            .join("\n");
          
          // Invoke LLM
          const { invokeLLM } = await import("./_core/llm");
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are an AI assistant integrated into a team chat. You help team members with questions about their CRM data, provide insights, and assist with tasks. Be concise and helpful. Recent conversation context:\n\n" + context,
              },
              {
                role: "user",
                content: input.content,
              },
            ],
          });
          
          const aiContent = response.choices[0]?.message?.content;
          const aiResponse = typeof aiContent === "string" ? aiContent : "I'm here to help! How can I assist you?";
          
          // Post AI assistant response
          await db.createMessage({
            id: randomUUID(),
            tenantId: ctx.user.tenantId,
            channelId: input.channelId,
            userId: "ai-assistant-bot",
            content: aiResponse,
            threadId: input.threadId,
          });
        }
        
        return message;
      }),
  }),
});

export type AppRouter = typeof appRouter;
