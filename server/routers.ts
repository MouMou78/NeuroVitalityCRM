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
    
    // Step 1: Initial signup with email/password
    signup: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { hashPassword: hashPw, generateTwoFactorSecret, generateQRCode, generateBackupCodes, hashBackupCodes, validatePassword } = await import("./auth");
        
        // Validate password strength
        const passwordError = validatePassword(input.password);
        if (passwordError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: passwordError });
        }
        
        // Check if email already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Email already registered" });
        }
        
        // Generate 2FA secret and QR code
        const twoFactorSecret = generateTwoFactorSecret();
        const qrCodeUrl = await generateQRCode(input.email, twoFactorSecret);
        
        // Generate backup codes
        const backupCodes = generateBackupCodes(10);
        const hashedBackupCodes = await hashBackupCodes(backupCodes);
        
        // Hash password
        const passwordHash = await hashPw(input.password);
        
        // Create user with 2FA not yet enabled
        const user = await db.createUserWithAuth({
          email: input.email,
          passwordHash,
          name: input.name,
          twoFactorSecret,
          twoFactorEnabled: false,
          backupCodes: hashedBackupCodes,
        });
        
        return {
          success: true,
          userId: user.id,
          qrCodeUrl,
          backupCodes, // Return plain codes for user to save
        };
      }),
    
    // Step 2: Verify 2FA setup and complete registration
    verifySignup: publicProcedure
      .input(z.object({
        userId: z.string(),
        token: z.string().length(6),
      }))
      .mutation(async ({ input }) => {
        const { verifyTwoFactorToken } = await import("./auth");
        
        const user = await db.getUserById(input.userId);
        if (!user || !user.twoFactorSecret) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        
        // Verify the token
        const isValid = await verifyTwoFactorToken(input.token, user.twoFactorSecret);
        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid 2FA code" });
        }
        
        // Enable 2FA
        await db.enableTwoFactor(user.id);
        
        // Send welcome email
        const { sendWelcomeEmail } = await import("./email");
        await sendWelcomeEmail(user.email, user.name || "User");
        
        return { success: true };
      }),
    
    // Step 1: Login with email/password
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { verifyPassword: verifyPw } = await import("./auth");
        
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        }
        
        const isValidPassword = await verifyPw(input.password, user.passwordHash);
        if (!isValidPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        }
        
        if (!user.twoFactorEnabled) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "2FA not set up. Please complete registration." });
        }
        
        return {
          success: true,
          userId: user.id,
          requires2FA: true,
        };
      }),
    
    // Step 2: Verify 2FA and complete login
    verifyLogin: publicProcedure
      .input(z.object({
        userId: z.string(),
        token: z.string(),
        isBackupCode: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { verifyTwoFactorToken, verifyBackupCode } = await import("./auth");
        
        const user = await db.getUserById(input.userId);
        if (!user || !user.twoFactorSecret) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        
        let isValid = false;
        
        if (input.isBackupCode) {
          // Verify backup code
          if (!user.backupCodes || user.backupCodes.length === 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "No backup codes available" });
          }
          isValid = await verifyBackupCode(input.token, user.backupCodes as string[]);
          if (isValid) {
            // Remove used backup code
            await db.removeBackupCode(user.id, input.token);
          }
        } else {
          // Verify TOTP token
          isValid = await verifyTwoFactorToken(input.token, user.twoFactorSecret);
        }
        
        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid 2FA code" });
        }
        
        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, user.id, cookieOptions);
        
        return { success: true, user };
      }),
    
    // Request password reset
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { generateResetToken } = await import("./auth");
        const { sendPasswordResetEmail } = await import("./email");
        
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          // Don't reveal if email exists
          return { success: true };
        }
        
        // Generate reset token
        const resetToken = generateResetToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        
        await db.setPasswordResetToken(user.id, resetToken, expiresAt);
        
        // Send email
        const baseUrl = `${ctx.req.protocol}://${ctx.req.get("host")}`;
        await sendPasswordResetEmail(user.email, resetToken, baseUrl);
        
        return { success: true };
      }),
    
    // Reset password with token
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const { hashPassword: hashPw, validatePassword } = await import("./auth");
        
        // Validate password strength
        const passwordError = validatePassword(input.newPassword);
        if (passwordError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: passwordError });
        }
        
        const user = await db.getUserByResetToken(input.token);
        if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset token" });
        }
        
        // Hash new password
        const passwordHash = await hashPw(input.newPassword);
        
        // Update password and clear reset token
        await db.updatePassword(user.id, passwordHash);
        await db.clearPasswordResetToken(user.id);
        
        return { success: true };
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
        conversationId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { queryAIAssistant } = await import("./aiAssistant");
        const response = await queryAIAssistant({
          tenantId: parseInt(ctx.user.tenantId),
          userId: parseInt(ctx.user.id),
          messages: input.messages,
        });
        
        // Auto-save conversation if conversationId provided
        if (input.conversationId) {
          const updatedMessages = [...input.messages, { role: "assistant" as const, content: response }];
          await db.updateAIConversation({
            id: input.conversationId,
            messages: updatedMessages,
          });
        }
        
        return { response };
      }),
    
    getConversations: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getAIConversations({
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
        });
      }),
    
    getConversation: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return db.getAIConversation(input.id);
      }),
    
    createConversation: protectedProcedure
      .input(z.object({
        title: z.string(),
        messages: z.array(z.object({
          role: z.string(),
          content: z.string(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createAIConversation({
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
          title: input.title,
          messages: input.messages,
        });
        return { id };
      }),
    
    updateConversation: protectedProcedure
      .input(z.object({
        id: z.string(),
        title: z.string().optional(),
        messages: z.array(z.object({
          role: z.string(),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateAIConversation(input);
        return { success: true };
      }),
    
    deleteConversation: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteAIConversation(input.id);
        return { success: true };
      }),
    
    getSuggestions: protectedProcedure
      .input(z.object({
        message: z.string(),
        context: z.object({
          page: z.string().optional(),
          contactId: z.string().optional(),
          contactName: z.string().optional(),
        }).optional(),
      }))
      .query(async ({ input }) => {
        const suggestions: Array<{ type: string; label: string; action: string; data?: any }> = [];
        
        const lowerMessage = input.message.toLowerCase();
        
        // Detect intent and generate suggestions
        if (lowerMessage.includes('contact') || lowerMessage.includes('person') || lowerMessage.includes('lead')) {
          if (lowerMessage.includes('create') || lowerMessage.includes('add') || lowerMessage.includes('new')) {
            suggestions.push({
              type: 'create_contact',
              label: 'Create new contact',
              action: '/people?action=create',
            });
          }
          if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('show')) {
            suggestions.push({
              type: 'view_contacts',
              label: 'View all contacts',
              action: '/people',
            });
          }
        }
        
        if (lowerMessage.includes('follow') || lowerMessage.includes('schedule') || lowerMessage.includes('remind')) {
          suggestions.push({
            type: 'schedule_followup',
            label: 'Schedule follow-up',
            action: input.context?.contactId ? `/people/${input.context.contactId}?action=followup` : '/people',
          });
        }
        
        if (lowerMessage.includes('email') || lowerMessage.includes('message') || lowerMessage.includes('send')) {
          suggestions.push({
            type: 'compose_email',
            label: 'Compose email',
            action: '/email-generator',
          });
        }
        
        if (lowerMessage.includes('insight') || lowerMessage.includes('analyz') || lowerMessage.includes('report')) {
          suggestions.push({
            type: 'view_insights',
            label: 'View insights',
            action: '/insights',
          });
        }
        
        if (lowerMessage.includes('pipeline') || lowerMessage.includes('funnel') || lowerMessage.includes('deal')) {
          suggestions.push({
            type: 'view_pipeline',
            label: 'View sales pipeline',
            action: '/funnel',
          });
        }
        
        return suggestions;
      }),
    
    generateContactInsights: protectedProcedure
      .input(z.object({
        contactId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get contact details
        const contact = await db.getPersonById(input.contactId);
        if (!contact) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });
        }
        
        // Get engagement history (moments, events, threads)
        const threads = await db.getThreadsByPerson(ctx.user.tenantId, input.contactId);
        const allMoments = await db.getMomentsByTenant(ctx.user.tenantId);
        const moments = allMoments.filter(m => threads.some(t => t.id === m.threadId));
        
        // Build context for AI
        let context = `Contact: ${contact.fullName}\n`;
        if (contact.companyName) context += `Company: ${contact.companyName}\n`;
        if (contact.roleTitle) context += `Title: ${contact.roleTitle}\n`;
        if (contact.primaryEmail) context += `Email: ${contact.primaryEmail}\n`;
        if (contact.engagementScore) context += `Engagement Score: ${contact.engagementScore}\n`;
        
        context += `\nRecent Activity:\n`;
        moments.slice(0, 10).forEach((moment: any) => {
          context += `- ${moment.type}: ${moment.description || ''} (${new Date(moment.timestamp).toLocaleDateString()})\n`;
        });
        
        if (threads.length > 0) {
          context += `\nActive Threads: ${threads.length}\n`;
          const latestThread = threads[0];
          if (latestThread.status) {
            context += `Latest Thread Status: ${latestThread.status}\n`;
          }
          if (latestThread.lastActivityAt) {
            context += `Last Activity: ${new Date(latestThread.lastActivityAt).toLocaleDateString()}\n`;
          }
        }
        
        // Generate insights using AI
        const { invokeLLM } = await import("./_core/llm");
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a CRM insights analyst. Analyze the contact's engagement history and provide: 1) A brief engagement summary (2-3 sentences), 2) Key patterns or trends, 3) 3 specific next-action recommendations. Be concise and actionable."
            },
            {
              role: "user",
              content: `Analyze this contact and provide insights:\n\n${context}`
            }
          ],
        });
        
        const content = response.choices[0].message.content;
        const insightsText = typeof content === 'string' ? content : JSON.stringify(content);
        
        return {
          insights: insightsText,
          contactName: contact.fullName,
          generatedAt: new Date().toISOString(),
        };
      }),
  }),
  
  amplemarket: router({
    getAccountById: protectedProcedure
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
    
    getAccountActivities: protectedProcedure
      .input(z.object({ accountId: z.string() }))
      .query(async ({ input, ctx }) => {
        const { getMomentsByAccount } = await import("./db-account-activities");
        const activities = await getMomentsByAccount(ctx.user.tenantId, input.accountId);
        
        // Enrich activities with person names
        const people = await db.getPeopleByTenant(ctx.user.tenantId);
        const peopleMap = new Map(people.map(p => [p.id, p]));
        
        return activities.map(activity => ({
          ...activity,
          personName: peopleMap.get(activity.personId)?.fullName || "Unknown",
          personEmail: peopleMap.get(activity.personId)?.primaryEmail || "",
        }));
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
        fileUrl: z.string().optional(),
        fileName: z.string().optional(),
        fileType: z.string().optional(),
        fileSize: z.number().optional(),
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
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
        });
        
        // Parse and notify mentioned users
        const mentions = db.parseMentions(input.content);
        if (mentions.length > 0 && mentions.some(m => m !== "ai" && m !== "assistant")) {
          const regularMentions = mentions.filter(m => m !== "ai" && m !== "assistant");
          const mentionedUserIds = await db.getUserIdsByUsernames(regularMentions, ctx.user.tenantId);
          
          for (const userId of mentionedUserIds) {
            await db.createNotification({
              id: randomUUID(),
              tenantId: ctx.user.tenantId,
              userId,
              type: "mention",
              messageId: message!.id,
              channelId: input.channelId,
              content: `${ctx.user.name || ctx.user.email} mentioned you: ${input.content.substring(0, 100)}`,
            });
          }
        }
        
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
    
    // Direct Messages
    getDirectMessages: protectedProcedure
      .input(z.object({
        otherUserId: z.string(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const dms = await db.getDirectMessagesBetweenUsers(
          ctx.user.id,
          input.otherUserId,
          input.limit
        );
        return dms;
      }),
    
    sendDirectMessage: protectedProcedure
      .input(z.object({
        recipientId: z.string(),
        content: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const { randomUUID } = await import("crypto");
        const dm = await db.createDirectMessage({
          id: randomUUID(),
          tenantId: ctx.user.tenantId,
          senderId: ctx.user.id,
          recipientId: input.recipientId,
          content: input.content,
        });
        return dm;
      }),
    
    getDirectMessageConversations: protectedProcedure
      .query(async ({ ctx }) => {
        const conversations = await db.getDirectMessageConversations(ctx.user.id);
        return conversations;
      }),
    
    // Reactions
    addReaction: protectedProcedure
      .input(z.object({
        messageId: z.string(),
        emoji: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { randomUUID } = await import("crypto");
        const reaction = await db.addReaction({
          id: randomUUID(),
          messageId: input.messageId,
          userId: ctx.user.id,
          emoji: input.emoji,
        });
        return reaction;
      }),
    
    removeReaction: protectedProcedure
      .input(z.object({
        messageId: z.string(),
        emoji: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const success = await db.removeReaction(
          input.messageId,
          ctx.user.id,
          input.emoji
        );
        return { success };
      }),
    
    getReactions: protectedProcedure
      .input(z.object({
        messageId: z.string(),
      }))
      .query(async ({ input }) => {
        const reactions = await db.getReactionsByMessage(input.messageId);
        return reactions;
      }),
    
    // Thread Replies
    getThreadReplies: protectedProcedure
      .input(z.object({
        threadId: z.string(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const replies = await db.getThreadReplies(input.threadId, input.limit);
        return replies;
      }),
    
    getThreadReplyCount: protectedProcedure
      .input(z.object({
        messageId: z.string(),
      }))
      .query(async ({ input }) => {
        const count = await db.getThreadReplyCount(input.messageId);
        return { count };
      }),
    
    // Unread Tracking
    markChannelAsRead: protectedProcedure
      .input(z.object({
        channelId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const success = await db.updateLastReadAt(input.channelId, ctx.user.id);
        return { success };
      }),
    
    getUnreadCount: protectedProcedure
      .input(z.object({
        channelId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        const count = await db.getUnreadCountForChannel(input.channelId, ctx.user.id);
        return { count };
      }),
    
    getUnreadCounts: protectedProcedure
      .query(async ({ ctx }) => {
        const counts = await db.getUnreadCountsForUser(ctx.user.id, ctx.user.tenantId);
        return counts;
      }),
    
    // Typing Indicators
    updateTyping: protectedProcedure
      .input(z.object({
        channelId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const success = await db.updateTypingIndicator(input.channelId, ctx.user.id);
        return { success };
      }),
    
    getTypingUsers: protectedProcedure
      .input(z.object({
        channelId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        const users = await db.getTypingUsers(input.channelId, ctx.user.id);
        return users;
      }),
    
    clearTyping: protectedProcedure
      .input(z.object({
        channelId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const success = await db.clearTypingIndicator(input.channelId, ctx.user.id);
        return { success };
      }),
    
    // Notifications
    getNotifications: protectedProcedure
      .query(async ({ ctx }) => {
        const notifications = await db.getUserNotifications(ctx.user.id);
        return notifications;
      }),
    
    getUnreadNotificationCount: protectedProcedure
      .query(async ({ ctx }) => {
        const count = await db.getUnreadNotificationCount(ctx.user.id);
        return { count };
      }),
    
    markNotificationAsRead: protectedProcedure
      .input(z.object({
        notificationId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const success = await db.markNotificationAsRead(input.notificationId);
        return { success };
      }),
    
    markAllNotificationsAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const success = await db.markAllNotificationsAsRead(ctx.user.id);
        return { success };
      }),
    
    // Message Search
    searchMessages: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
        channelId: z.string().optional(),
        userId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const results = await db.searchMessages({
          tenantId: ctx.user.tenantId,
          ...input,
        });
        return results;
      }),
  }),

  email: router({
    listAccounts: protectedProcedure
      .query(async ({ ctx }) => {
        const accounts = await db.getEmailAccountsByUser(ctx.user.id);
        return accounts;
      }),
    
    addAccount: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        provider: z.string(),
        smtpHost: z.string(),
        smtpPort: z.number(),
        smtpUser: z.string(),
        smtpPass: z.string(),
        imapHost: z.string(),
        imapPort: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const account = await db.createEmailAccount({
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
          ...input,
        });
        return account;
      }),
    
    removeAccount: protectedProcedure
      .input(z.object({
        accountId: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteEmailAccount(input.accountId);
        return { success: true };
      }),
    
    setDefaultAccount: protectedProcedure
      .input(z.object({
        accountId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.setDefaultEmailAccount(ctx.user.id, input.accountId);
        return { success: true };
      }),
  }),

  campaigns: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const campaigns = await db.getCampaignsByTenant(ctx.user.tenantId);
        return campaigns;
      }),
    
    create: protectedProcedure
      .input(z.object({
        subject: z.string(),
        body: z.string(),
        recipientType: z.string(),
        scheduledFor: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const campaign = await db.createCampaign({
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
          ...input,
        });
        return campaign;
      }),
    
    addRecipients: protectedProcedure
      .input(z.object({
        campaignId: z.string(),
        personIds: z.array(z.string()),
      }))
      .mutation(async ({ input, ctx }) => {
        const { addCampaignRecipients } = await import("./campaign-sender");
        const result = await addCampaignRecipients(
          input.campaignId,
          ctx.user.tenantId,
          input.personIds
        );
        return result;
      }),
    
    send: protectedProcedure
      .input(z.object({
        campaignId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { sendCampaign } = await import("./campaign-sender");
        const result = await sendCampaign(
          input.campaignId,
          ctx.user.tenantId,
          ctx.user.id
        );
        return result;
      }),
    
    getStats: protectedProcedure
      .input(z.object({
        campaignId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        const { getCampaignStats } = await import("./campaign-sender");
        const stats = await getCampaignStats(input.campaignId, ctx.user.tenantId);
        return stats;
      }),
  }),

  admin: router({
    listUsers: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const users = await db.getAllUsersByTenant(ctx.user.tenantId);
        return users;
      }),
    
    updateUserRole: protectedProcedure
      .input(z.object({
        userId: z.string(),
        role: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    
    toggleUserStatus: protectedProcedure
      .input(z.object({
        userId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await db.toggleUserStatus(input.userId);
        return { success: true };
      }),
    
    resetUser2FA: protectedProcedure
      .input(z.object({
        userId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await db.resetUserTwoFactor(input.userId);
        return { success: true };
      }),
  }),

  accounts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getAccountsByTenant(ctx.user.tenantId);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return db.getAccountById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        domain: z.string().optional(),
        industry: z.string().optional(),
        headquarters: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createAccount({
          ...input,
          tenantId: ctx.user.tenantId,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        domain: z.string().optional(),
        industry: z.string().optional(),
        headquarters: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateAccount(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteAccount(input.id);
        return { success: true };
      }),
  }),

  notifications: router({
    getUnread: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserNotifications(ctx.user.id);
    }),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),

    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.markAllNotificationsAsRead(ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
