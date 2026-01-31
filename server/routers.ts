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
        return { person, threads };
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
    query: protectedProcedure
      .input(z.object({ query: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { processAssistantQuery } = await import("./ai-assistant");
        return processAssistantQuery(input.query, {
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
        });
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
  }),
});

export type AppRouter = typeof appRouter;
