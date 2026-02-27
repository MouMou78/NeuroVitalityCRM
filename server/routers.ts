import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { customAuthRouter } from "./routers/customAuthRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { getEmailExamples, createEmailExample, deleteEmailExample } from "./db";
import { hashPassword, verifyPassword, parseTriggerDate } from "./utils";
import { TRPCError } from "@trpc/server";
import { processMoment } from "./rules-engine";
import { computeFunnelStage, groupThreadsByStage, computeVelocity } from "./funnel";
import { calculateEngagementScore, getScoreBreakdown } from "./scoring";
import { scoreContact } from "./lead-scoring";
import { invokeLLM } from "./_core/llm";
import axios from "axios";

export const appRouter = router({
  system: systemRouter,
  customAuth: customAuthRouter,
  
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
      const people = await db.getPeopleByTenant(ctx.user.tenantId);
      // Add name field for frontend display
      return people.map((p: any) => ({
        ...p,
        name: [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown'
      }));
    }),
    
    getHotLeads: protectedProcedure.query(async ({ ctx }) => {
      const people = await db.getPeopleByTenant(ctx.user.tenantId);
      // Return contacts with combined score >= 70
      return people
        .filter((p: any) => (p.combinedScore || 0) >= 70)
        .sort((a: any, b: any) => (b.combinedScore || 0) - (a.combinedScore || 0))
        .slice(0, 10);
    }),
    
    getActivitySummaries: protectedProcedure
      .input(z.object({ personIds: z.array(z.string()) }))
      .query(async ({ input, ctx }) => {
        const { getContactActivitySummaries } = await import('./db-contact-activity');
        const summaries = await getContactActivitySummaries(ctx.user.tenantId, input.personIds);
        return Object.fromEntries(summaries);
      }),
    
    updateRole: protectedProcedure
      .input(z.object({ 
        personId: z.string(),
        buyingRole: z.enum(["Decision Maker", "Champion", "Influencer", "User", "Blocker"]).nullable()
      }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonById(input.personId);
        if (!person || person.tenantId !== ctx.user.tenantId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        const { updatePersonRole } = await import('./db-people-update');
        await updatePersonRole(input.personId, input.buyingRole);
        
        return { success: true };
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
        accountId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { checkDuplicatePerson } = await import("./duplicate-detection");
        const nameParts = input.fullName.split(" ");
        const firstName = nameParts[0] || null;
        const lastName = nameParts.slice(1).join(" ") || null;
        
        const duplicateCheck = await checkDuplicatePerson(
          ctx.user.tenantId,
          input.primaryEmail,
          firstName,
          lastName,
          input.accountId || null
        );
        
        if (duplicateCheck.isDuplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: duplicateCheck.reason || "A duplicate contact already exists.",
            cause: {
              existingRecordId: duplicateCheck.existingRecordId,
              existingRecordName: duplicateCheck.existingRecordName,
            },
          });
        }
        
        const person = await db.createPerson({
          tenantId: ctx.user.tenantId,
          ...input,
        });
        
        // Auto-enrich new contact if missing key fields
        const { needsEnrichment, enrichContact } = await import("./enrichment");
        if (needsEnrichment(person)) {
          // Trigger enrichment asynchronously (don't wait for it)
          enrichContact(person.id, person.primaryEmail).catch(err => {
            console.error(`Auto-enrichment failed for person ${person.id}:`, err);
          });
        }
        
        return person;
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
    
    merge: protectedProcedure
      .input(z.object({
        sourceContactId: z.string(),
        targetContactId: z.string(),
        mergedFields: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.mergeContacts({
          tenantId: ctx.user.tenantId,
          sourceContactId: input.sourceContactId,
          targetContactId: input.targetContactId,
          mergedFields: input.mergedFields,
        });
      }),
    
    getByDeal: protectedProcedure
      .input(z.object({ dealId: z.string() }))
      .query(async ({ input, ctx }) => {
        const { getDealById } = await import("./db-deals");
        const deal = await getDealById(input.dealId, ctx.user.tenantId);
        
        if (!deal) {
          return [];
        }
        
        // Get contacts associated with this deal
        const contacts: any[] = [];
        
        // Add primary contact if exists
        if (deal.contactId) {
          const contact = await db.getPersonById(deal.contactId);
          if (contact && contact.tenantId === ctx.user.tenantId) {
            contacts.push(contact);
          }
        }
        
        // Get all contacts from the deal's account
        if (deal.accountId) {
          const accountContacts = await db.getPeopleByAccount(ctx.user.tenantId, deal.accountId);
          // Add contacts that aren't already in the list
          for (const contact of accountContacts) {
            if (!contacts.find(c => c.id === contact.id)) {
              contacts.push(contact);
            }
          }
        }
        
        return contacts;
      }),
    
    enrich: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonById(input.personId);
        if (!person || person.tenantId !== ctx.user.tenantId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        if (!person.primaryEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Contact must have an email address" });
        }
        
        const { enrichContact } = await import("./enrichment");
        const result = await enrichContact(input.personId, person.primaryEmail);
        
        return result;
      }),
    
    batchEnrich: protectedProcedure
      .input(z.object({ personIds: z.array(z.string()) }))
      .mutation(async ({ input, ctx }) => {
        // Verify all persons belong to tenant
        for (const personId of input.personIds) {
          const person = await db.getPersonById(personId);
          if (!person || person.tenantId !== ctx.user.tenantId) {
            throw new TRPCError({ code: "NOT_FOUND", message: `Person ${personId} not found` });
          }
        }
        
        const { batchEnrichContacts } = await import("./enrichment");
        const result = await batchEnrichContacts(input.personIds);
        
        return result;
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
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getMomentsByTenant(ctx.user.tenantId);
      }),
    
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
    getDealPipeline: protectedProcedure
      .query(async ({ ctx }) => {
        const { getDealPipelineByStage } = await import("./analytics");
        return getDealPipelineByStage(ctx.user.tenantId);
      }),
    
    getConversionRates: protectedProcedure
      .query(async ({ ctx }) => {
        const { getStageConversionRates } = await import("./analytics");
        return getStageConversionRates(ctx.user.tenantId);
      }),
    
    getDealCycleTime: protectedProcedure
      .query(async ({ ctx }) => {
        const { getAverageDealCycleTime } = await import("./analytics");
        return getAverageDealCycleTime(ctx.user.tenantId);
      }),
    
    getCampaignTrends: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { getCampaignPerformanceTrends } = await import("./analytics");
        return getCampaignPerformanceTrends(ctx.user.tenantId, input.startDate, input.endDate);
      }),
    
    getOverallMetrics: protectedProcedure
      .query(async ({ ctx }) => {
        const { getOverallMetrics } = await import("./analytics");
        return getOverallMetrics(ctx.user.tenantId);
      }),
    
    getPipelineVelocity: protectedProcedure
      .query(async ({ ctx }) => {
        const { getDealsByTenant } = await import("./db-deals");
        const deals = await getDealsByTenant(ctx.user.tenantId);
        
        const closedDeals = deals.filter((d: any) => d.stageId === "closed-won" || d.stageId === "closed-lost");
        const wonDeals = deals.filter((d: any) => d.stageId === "closed-won");
        
        // Calculate average days to close
        const daysToClose = closedDeals
          .filter((d: any) => d.createdAt && d.closedAt)
          .map((d: any) => {
            const created = new Date(d.createdAt).getTime();
            const closed = new Date(d.closedAt).getTime();
            return Math.floor((closed - created) / (1000 * 60 * 60 * 24));
          });
        
        const avgDaysToClose = daysToClose.length > 0
          ? Math.round(daysToClose.reduce((a: number, b: number) => a + b, 0) / daysToClose.length)
          : 0;
        
        const winRate = closedDeals.length > 0
          ? Math.round((wonDeals.length / closedDeals.length) * 100)
          : 0;
        
        const totalValue = wonDeals.reduce((sum: number, d: any) => sum + (Number(d.value) || 0), 0);
        
        return {
          avgDaysToClose,
          winRate,
          closedDeals: closedDeals.length,
          totalValue,
        };
      }),
    
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

    // ---- Persistent Memory endpoints ----
    getMemories: protectedProcedure
      .query(async ({ ctx }) => {
        const { requireAIMemoryPermission, getAllMemories } = await Promise.all([
          import("./permissions"),
          import("./aiMemoryService"),
        ]).then(([p, m]) => ({ requireAIMemoryPermission: p.requireAIMemoryPermission, getAllMemories: m.getAllMemories }));
        requireAIMemoryPermission(ctx.user.role);
        return getAllMemories(ctx.user.tenantId);
      }),

    deleteMemory: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { requireAIMemoryPermission } = await import("./permissions");
        requireAIMemoryPermission(ctx.user.role);
        const { deleteMemory } = await import("./aiMemoryService");
        await deleteMemory(input.id, ctx.user.tenantId);
        return { success: true };
      }),

    rememberThis: protectedProcedure
      .input(z.object({ content: z.string().min(1).max(500) }))
      .mutation(async ({ input, ctx }) => {
        const { storeUserStatedMemory } = await import("./aiMemoryService");
        await storeUserStatedMemory({
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
          content: input.content,
        });
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
    
    send: protectedProcedure
      .input(z.object({
        to: z.string().email(),
        subject: z.string(),
        body: z.string(),
        contactId: z.string().optional(),
        dealId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { sendEmail } = await import('./email');
        
        // Get default email account for the user
        const accounts = await db.getEmailAccountsByUser(ctx.user.id);
        const defaultAccount = accounts.find(acc => acc.isDefault) || accounts[0];
        
        if (!defaultAccount) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'No email account configured. Please add an email account first.',
          });
        }
        
        // Send email using the configured SMTP account
        await sendEmail(
          input.to,
          input.subject,
          input.body.replace(/\n/g, '<br>')
        );
        
        // Email sent successfully - activity logging can be added later
        
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
        name: z.string(),
        subject: z.string(),
        body: z.string(),
        recipientType: z.string(),
        scheduledFor: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { checkDuplicateCampaign } = await import("./duplicate-detection");
        
        const duplicateCheck = await checkDuplicateCampaign(
          ctx.user.tenantId,
          input.name
        );
        
        if (duplicateCheck.isDuplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: duplicateCheck.reason || "A duplicate campaign already exists.",
            cause: {
              existingRecordId: duplicateCheck.existingRecordId,
              existingRecordName: duplicateCheck.existingRecordName,
            },
          });
        }
        
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
        const { getCampaignTrackingStats } = await import("./email-tracking");
        
        const basicStats = await getCampaignStats(input.campaignId, ctx.user.tenantId);
        const trackingStats = await getCampaignTrackingStats(input.campaignId);
        
        return {
          ...basicStats,
          ...trackingStats,
        };
      }),
    
    schedule: protectedProcedure
      .input(z.object({
        campaignId: z.string(),
        scheduledAt: z.date(),
        timezone: z.string().default("UTC"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { scheduleCampaign } = await import("./campaign-scheduler");
        const result = await scheduleCampaign(
          input.campaignId,
          ctx.user.tenantId,
          input.scheduledAt,
          input.timezone
        );
        return result;
      }),
    
    cancelScheduled: protectedProcedure
      .input(z.object({
        campaignId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { cancelScheduledCampaign } = await import("./campaign-scheduler");
        const result = await cancelScheduledCampaign(input.campaignId, ctx.user.tenantId);
        return result;
      }),
    
    reschedule: protectedProcedure
      .input(z.object({
        campaignId: z.string(),
        newScheduledAt: z.date(),
        timezone: z.string().default("UTC"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { rescheduleCampaign } = await import("./campaign-scheduler");
        const result = await rescheduleCampaign(
          input.campaignId,
          ctx.user.tenantId,
          input.newScheduledAt,
          input.timezone
        );
        return result;
      }),
    
    getScheduled: protectedProcedure
      .query(async ({ ctx }) => {
        const { getScheduledCampaigns } = await import("./campaign-scheduler");
        const campaigns = await getScheduledCampaigns(ctx.user.tenantId);
        return campaigns;
      }),
    
    processScheduled: protectedProcedure
      .mutation(async ({ ctx }) => {
        // Admin-only endpoint to manually trigger scheduled campaign processing
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const { processScheduledCampaigns } = await import("./campaign-scheduler");
        const result = await processScheduledCampaigns();
        return result;
      }),
  }),

  admin: router({
    listUsers: protectedProcedure
      .query(async ({ ctx }) => {
        const { hasMinRole } = await import('./permissions');
        if (!hasMinRole(ctx.user.role, 'admin')) {
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
        const { hasMinRole } = await import('./permissions');
        if (!hasMinRole(ctx.user.role, 'admin')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        // Only engineering can assign engineering role
        if (input.role === 'engineering' && ctx.user.role !== 'engineering') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only engineering can assign the engineering role' });
        }
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    
    toggleUserStatus: protectedProcedure
      .input(z.object({
        userId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasMinRole } = await import('./permissions');
        if (!hasMinRole(ctx.user.role, 'admin')) {
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
        const { hasMinRole } = await import('./permissions');
        if (!hasMinRole(ctx.user.role, 'admin')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await db.resetUserTwoFactor(input.userId);
        return { success: true };
      }),

    inviteUser: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        role: z.enum(['engineering', 'owner', 'admin', 'manager', 'sales', 'operations', 'collaborator', 'user', 'member']),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasMinRole } = await import('./permissions');
        if (!hasMinRole(ctx.user.role, 'admin')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        if (input.role === 'owner' && !hasMinRole(ctx.user.role, 'owner')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners and above can invite owners' });
        }
        if (input.role === 'engineering' && ctx.user.role !== 'engineering') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only engineering can invite other engineering users' });
        }
        const existing = await db.getUserByEmail(ctx.user.tenantId, input.email);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'A user with this email already exists' });
        }
        const { randomBytes } = await import('crypto');
        const bcrypt = await import('bcryptjs');
        const tempPassword = randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        const userId = randomBytes(16).toString('hex');
        const { getDb } = await import('./db');
        const { users: usersTable } = await import('../drizzle/schema');
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
        await dbConn.insert(usersTable).values({
          id: userId,
          tenantId: ctx.user.tenantId,
          email: input.email,
          passwordHash,
          name: input.name || input.email.split('@')[0],
          role: input.role,
          twoFactorEnabled: false,
          disabled: false,
        });
        const resetToken = randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.setPasswordResetToken(userId, resetToken, expires);
        const appUrl = process.env.APP_URL || 'https://www.crmneurovitality.com';
        const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
        return {
          success: true,
          userId,
          email: input.email,
          resetUrl,
        };
      }),

    deleteUser: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { hasMinRole } = await import('./permissions');
        if (!hasMinRole(ctx.user.role, 'admin')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot delete your own account' });
        }
        const { getDb } = await import('./db');
        const { users: usersTable } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
        await dbConn.delete(usersTable).where(eq(usersTable.id, input.userId));
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
        const { checkDuplicateAccount } = await import("./duplicate-detection");
        
        const duplicateCheck = await checkDuplicateAccount(
          ctx.user.tenantId,
          input.name,
          input.domain || null
        );
        
        if (duplicateCheck.isDuplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: duplicateCheck.reason || "A duplicate account already exists.",
            cause: {
              existingRecordId: duplicateCheck.existingRecordId,
              existingRecordName: duplicateCheck.existingRecordName,
            },
          });
        }
        
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
      .mutation(async ({ input, ctx }) => {
        const { requireDeletePermission } = await import("./permissions");
        requireDeletePermission(ctx.user.role);
        await db.deleteAccount(input.id);
        return { success: true };
      }),

    merge: protectedProcedure
      .input(z.object({
        sourceId: z.string(),
        targetId: z.string(),
        mergedFields: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.mergeAccounts(
          ctx.user.tenantId,
          input.sourceId,
          input.targetId,
          input.mergedFields
        );
      }),

    parseCSV: protectedProcedure
      .input(z.object({ csvContent: z.string() }))
      .mutation(async ({ input }) => {
        const lines = input.csvContent.trim().split('\n');
        if (lines.length < 2) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'CSV must have at least a header row and one data row' });
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const preview = lines.slice(1, 6).map(line => {
          const values = line.split(',').map(v => v.trim());
          return headers.reduce((obj, header, idx) => {
            obj[header] = values[idx] || '';
            return obj;
          }, {} as Record<string, string>);
        });

        return { headers, preview, totalRows: lines.length - 1 };
      }),

    importAccounts: protectedProcedure
      .input(z.object({
        csvContent: z.string(),
        fieldMapping: z.record(z.string(), z.string()),
      }))
      .mutation(async ({ input, ctx }) => {
        const lines = input.csvContent.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];
        const mapping = input.fieldMapping as Record<string, string>;

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row = headers.reduce((obj, header, idx) => {
            obj[header] = values[idx] || '';
            return obj;
          }, {} as Record<string, string>);

          const name = row[mapping.name];
          if (!name) {
            skipped++;
            continue;
          }

          // Check for duplicates
          const duplicates = await db.findDuplicateAccounts(ctx.user.tenantId, name);
          if (duplicates.length > 0) {
            skipped++;
            continue;
          }

          try {
            await db.createAccount({
              tenantId: ctx.user.tenantId,
              name,
              domain: mapping.domain ? row[mapping.domain] || undefined : undefined,
              industry: mapping.industry ? row[mapping.industry] || undefined : undefined,
              headquarters: mapping.headquarters ? row[mapping.headquarters] || undefined : undefined,
            });
            imported++;
          } catch (error) {
            errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            skipped++;
          }
        }

        return { imported, skipped, errors };
      }),
  }),
  
  forecasting: router({
    generate: protectedProcedure
      .input(z.object({
        timeframe: z.enum(["month", "quarter", "year"]).optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { generateForecast } = await import("./forecasting");
        return generateForecast(ctx.user.tenantId, input.timeframe);
      }),
    
    scenarios: protectedProcedure
      .query(async ({ ctx }) => {
        const { generateScenarios } = await import("./forecasting");
        return generateScenarios(ctx.user.tenantId);
      }),
    
    trend: protectedProcedure
      .input(z.object({
        months: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { getForecastTrend } = await import("./forecasting");
        return getForecastTrend(ctx.user.tenantId, input.months);
      }),
  }),
  
  automation: router({
    getRules: protectedProcedure
      .query(async ({ ctx }) => {
        const { getAutomationRules } = await import("./db-automation");
        return getAutomationRules(ctx.user.tenantId);
      }),
    
    getRule: protectedProcedure
      .input(z.object({ ruleId: z.string() }))
      .query(async ({ input }) => {
        const { getAutomationRuleById } = await import("./db-automation");
        return getAutomationRuleById(input.ruleId);
      }),
    
    createRule: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        triggerType: z.enum(["email_opened", "email_replied", "no_reply_after_days", "meeting_held", "stage_entered", "deal_value_threshold", "scheduled"]),
        triggerConfig: z.record(z.string(), z.any()).optional(),
        actionType: z.enum(["move_stage", "send_notification", "create_task", "enroll_sequence", "update_field"]),
        actionConfig: z.record(z.string(), z.any()).optional(),
        conditions: z.object({
          logic: z.enum(['AND', 'OR']),
          rules: z.array(z.object({
            field: z.string(),
            operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains', 'is_empty', 'is_not_empty']),
            value: z.any(),
          })),
        }).optional(),
        priority: z.number().optional(),
        schedule: z.string().optional(),
        timezone: z.string().optional(),
        status: z.enum(["active", "paused"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createAutomationRule } = await import("./db-automation");
        const ruleId = await createAutomationRule({
          ...input,
          tenantId: ctx.user.tenantId,
        });
        return { ruleId };
      }),
    
    updateRule: protectedProcedure
      .input(z.object({
        ruleId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        triggerConfig: z.record(z.string(), z.any()).optional(),
        actionConfig: z.record(z.string(), z.any()).optional(),
        status: z.enum(["active", "paused"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateAutomationRule } = await import("./db-automation");
        const { ruleId, ...data } = input;
        await updateAutomationRule(ruleId, data);
        return { success: true };
      }),
    
    deleteRule: protectedProcedure
      .input(z.object({ ruleId: z.string() }))
      .mutation(async ({ input }) => {
        const { deleteAutomationRule } = await import("./db-automation");
        await deleteAutomationRule(input.ruleId);
        return { success: true };
      }),
    
    cloneRule: protectedProcedure
      .input(z.object({ 
        ruleId: z.string(),
        name: z.string().optional(),
        priority: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getAutomationRuleById, createAutomationRule } = await import("./db-automation");
        const originalRule = await getAutomationRuleById(input.ruleId);
        if (!originalRule) throw new Error("Rule not found");
        
        const { id, createdAt, updatedAt, nextRunAt, ...ruleData } = originalRule;
        const newRuleId = await createAutomationRule({
          tenantId: ctx.user.tenantId,
          name: input.name || `${originalRule.name} (Copy)`,
          description: ruleData.description || undefined,
          triggerType: ruleData.triggerType,
          triggerConfig: ruleData.triggerConfig || undefined,
          actionType: ruleData.actionType,
          actionConfig: ruleData.actionConfig || undefined,
          conditions: ruleData.conditions || undefined,
          priority: input.priority !== undefined ? input.priority : (ruleData.priority || undefined),
          schedule: ruleData.schedule || undefined,
          timezone: ruleData.timezone || undefined,
          status: "paused", // Clone as paused for safety
        });
        return { ruleId: newRuleId };
      }),
    
    getExecutions: protectedProcedure
      .input(z.object({ ruleId: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const { getAutomationExecutions } = await import("./db-automation");
        return getAutomationExecutions(ctx.user.tenantId, input.ruleId);
      }),
    
    getTemplates: protectedProcedure
      .query(async () => {
        const { automationTemplates } = await import("./automation-templates");
        return automationTemplates;
      }),
    
    installTemplate: protectedProcedure
      .input(z.object({
        templateId: z.string(),
        name: z.string().optional(),
        priority: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getTemplateById } = await import("./automation-templates");
        const { createAutomationRule } = await import("./db-automation");
        const { incrementTemplateInstall } = await import("./db-automation-templates");
        
        const template = getTemplateById(input.templateId);
        if (!template) throw new Error("Template not found");
        
        const ruleId = await createAutomationRule({
          tenantId: ctx.user.tenantId,
          name: input.name || template.name,
          description: template.description,
          triggerType: template.triggerType,
          triggerConfig: template.triggerConfig,
          actionType: template.actionType,
          actionConfig: template.actionConfig,
          conditions: template.conditions,
          priority: input.priority !== undefined ? input.priority : template.priority,
          status: "active",
        });
        
        // Track installation
        await incrementTemplateInstall(input.templateId);
        
        return { ruleId };
      }),
    
    // Template Reviews
    submitReview: protectedProcedure
      .input(z.object({
        templateId: z.string(),
        rating: z.number().min(1).max(5),
        review: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createTemplateReview } = await import("./db-automation-templates");
        const reviewId = await createTemplateReview({
          templateId: input.templateId,
          userId: ctx.user.id,
          tenantId: ctx.user.tenantId,
          rating: input.rating,
          review: input.review,
        });
        return { reviewId };
      }),
    
    getReviews: protectedProcedure
      .input(z.object({ templateId: z.string() }))
      .query(async ({ input }) => {
        const { getTemplateReviews } = await import("./db-automation-templates");
        return getTemplateReviews(input.templateId);
      }),
    
    getRating: protectedProcedure
      .input(z.object({ templateId: z.string() }))
      .query(async ({ input }) => {
        const { getTemplateRating } = await import("./db-automation-templates");
        return getTemplateRating(input.templateId);
      }),
    
    // Template Analytics
    getAnalytics: protectedProcedure
      .input(z.object({ templateId: z.string() }))
      .query(async ({ input }) => {
        const { getTemplateAnalytics } = await import("./db-automation-templates");
        return getTemplateAnalytics(input.templateId);
      }),
    
    getTrending: protectedProcedure
      .query(async () => {
        const { getTrendingTemplates } = await import("./db-automation-templates");
        return getTrendingTemplates(10);
      }),
    
    // User Templates
    saveAsTemplate: protectedProcedure
      .input(z.object({
        ruleId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        category: z.enum(["lead_nurturing", "deal_management", "task_automation", "notifications"]),
        isPublic: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getAutomationRuleById } = await import("./db-automation");
        const { createUserTemplate } = await import("./db-automation-templates");
        
        const rule = await getAutomationRuleById(input.ruleId);
        if (!rule) throw new Error("Rule not found");
        
        const templateId = await createUserTemplate({
          userId: ctx.user.id,
          tenantId: ctx.user.tenantId,
          name: input.name,
          description: input.description,
          category: input.category,
          triggerType: rule.triggerType,
          triggerConfig: rule.triggerConfig || {},
          actionType: rule.actionType,
          actionConfig: rule.actionConfig || {},
          conditions: rule.conditions,
          priority: rule.priority,
          isPublic: input.isPublic,
          baseTemplateId: undefined,
        });
        
        return { templateId };
      }),
    
    getMyTemplates: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserTemplates } = await import("./db-automation-templates");
        return getUserTemplates(ctx.user.id, ctx.user.tenantId);
      }),
    
    getPublicTemplates: protectedProcedure
      .query(async () => {
        const { getPublicUserTemplates } = await import("./db-automation-templates");
        return getPublicUserTemplates();
      }),
    
    updateMyTemplate: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateUserTemplate } = await import("./db-automation-templates");
        const { id, ...data } = input;
        await updateUserTemplate(id, data);
        return { success: true };
      }),
    
    deleteMyTemplate: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const { deleteUserTemplate } = await import("./db-automation-templates");
        await deleteUserTemplate(input.id);
        return { success: true };
      }),
    
    getVersionHistory: protectedProcedure
      .input(z.object({ templateId: z.string() }))
      .query(async ({ input }) => {
        const { getTemplateVersionHistory } = await import("./db-automation-templates");
        return getTemplateVersionHistory(input.templateId);
      }),
    
    rollbackTemplate: protectedProcedure
      .input(z.object({
        templateId: z.string(),
        versionId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { rollbackTemplateToVersion } = await import("./db-automation-templates");
        await rollbackTemplateToVersion(input.templateId, input.versionId);
        return { success: true };
      }),
    
    getRecommendations: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const { getRecommendations } = await import("./recommendation-engine");
        return getRecommendations(ctx.user.id, ctx.user.tenantId, input.limit || 5);
      }),

    bulkDeleteTemplates: protectedProcedure
      .input(z.object({ templateIds: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        const { deleteUserTemplate } = await import("./db-automation-templates");
        for (const templateId of input.templateIds) {
          await deleteUserTemplate(templateId);
        }
        return { success: true, count: input.templateIds.length };
      }),

    bulkToggleVisibility: protectedProcedure
      .input(z.object({ templateIds: z.array(z.string()), isPublic: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const { updateUserTemplate } = await import("./db-automation-templates");
        for (const templateId of input.templateIds) {
          await updateUserTemplate(templateId, { isPublic: input.isPublic });
        }
        return { success: true, count: input.templateIds.length };
      }),
  }),
  
  collaboration: router({
    getActivityFeed: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const { getActivityFeed } = await import("./db-collaboration");
        return getActivityFeed(ctx.user.tenantId, input.limit);
      }),
    
    getEntityActivity: protectedProcedure
      .input(z.object({
        entityType: z.enum(["deal", "contact", "account", "task", "email"]),
        entityId: z.string(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { getEntityActivity } = await import("./db-collaboration");
        return getEntityActivity(ctx.user.tenantId, input.entityType, input.entityId, input.limit);
      }),
    
    getUserActivity: protectedProcedure
      .input(z.object({
        userId: z.string(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { getUserActivity } = await import("./db-collaboration");
        return getUserActivity(ctx.user.tenantId, input.userId, input.limit);
      }),
    
    getSharedViews: protectedProcedure
      .input(z.object({ viewType: z.enum(["deals", "contacts", "accounts", "tasks"]).optional() }))
      .query(async ({ input, ctx }) => {
        const { getSharedViews } = await import("./db-collaboration");
        return getSharedViews(ctx.user.tenantId, ctx.user.id, input.viewType);
      }),
    
    createSharedView: protectedProcedure
      .input(z.object({
        name: z.string(),
        viewType: z.enum(["deals", "contacts", "accounts", "tasks"]),
        filters: z.record(z.string(), z.any()).optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
        isPublic: z.boolean().optional(),
        sharedWithUserIds: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createSharedView } = await import("./db-collaboration");
        const viewId = await createSharedView({
          ...input,
          tenantId: ctx.user.tenantId,
          createdById: ctx.user.id,
        });
        return { viewId };
      }),
    
    updateSharedView: protectedProcedure
      .input(z.object({
        viewId: z.string(),
        name: z.string().optional(),
        filters: z.record(z.string(), z.any()).optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
        isPublic: z.boolean().optional(),
        sharedWithUserIds: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateSharedView } = await import("./db-collaboration");
        const { viewId, ...data } = input;
        await updateSharedView(viewId, data);
        return { success: true };
      }),
    
    deleteSharedView: protectedProcedure
      .input(z.object({ viewId: z.string() }))
      .mutation(async ({ input }) => {
        const { deleteSharedView } = await import("./db-collaboration");
        await deleteSharedView(input.viewId);
        return { success: true };
      }),
  }),
  
  calendar: router({
    getConfig: protectedProcedure
      .query(async ({ ctx }) => {
        // Return OAuth configuration status
        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || "";
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || "";
        const { getUserIntegrations } = await import("./calendar-sync");
        const integrations = await getUserIntegrations(ctx.user.tenantId, ctx.user.id);
        const googleIntegration = integrations.find(i => i.provider === "google");
        
        return {
          clientId: clientId ? clientId.slice(0, 20) + "..." : "",
          clientSecret: clientSecret ? "***" : "",
          connected: googleIntegration?.isActive || false,
          email: null,
        };
      }),
    
    saveConfig: protectedProcedure
      .input(z.object({
        clientId: z.string(),
        clientSecret: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasMinRole: _hmrOAuth } = await import('./permissions');
        if (!_hmrOAuth(ctx.user.role, 'admin')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        // In production, these should be stored securely (e.g., using webdev_request_secrets)
        // For now, return success - actual implementation would use secrets management
        return { success: true, message: "OAuth credentials should be set via environment variables" };
      }),
    
    connect: protectedProcedure
      .mutation(async ({ ctx }) => {
        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        if (!clientId) {
          throw new TRPCError({ 
            code: 'PRECONDITION_FAILED', 
            message: 'Google OAuth not configured. Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET environment variables.' 
          });
        }
        
        // Redirect the user directly to the Google OAuth initiation route
        // which is registered as GET /api/oauth/google and handles state + redirect_uri
        return { authUrl: '/api/oauth/google' };
      }),
    
    disconnect: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { getUserIntegrations, deleteCalendarIntegration } = await import("./calendar-sync");
        const integrations = await getUserIntegrations(ctx.user.tenantId, ctx.user.id);
        const googleIntegration = integrations.find(i => i.provider === "google");
        
        if (googleIntegration) {
          await deleteCalendarIntegration(googleIntegration.id);
        }
        
        return { success: true };
      }),

    getIntegrations: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserIntegrations } = await import("./calendar-sync");
        return getUserIntegrations(ctx.user.tenantId, ctx.user.id);
      }),
    
    createIntegration: protectedProcedure
      .input(z.object({
        provider: z.enum(["google", "outlook"]),
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        expiresAt: z.date().optional(),
        calendarId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createCalendarIntegration } = await import("./calendar-sync");
        const integrationId = await createCalendarIntegration({
          ...input,
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
        });
        return { integrationId };
      }),
    
    deleteIntegration: protectedProcedure
      .input(z.object({ integrationId: z.string() }))
      .mutation(async ({ input }) => {
        const { deleteCalendarIntegration } = await import("./calendar-sync");
        await deleteCalendarIntegration(input.integrationId);
        return { success: true };
      }),
    
    syncNow: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { syncAllCalendars } = await import("./calendar-sync");
        return syncAllCalendars(ctx.user.tenantId);
      }),
    
    getEvents: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { getCalendarEvents } = await import("./calendar-sync");
        return getCalendarEvents(ctx.user.tenantId, input.startDate, input.endDate);
      }),
    
    linkEvent: protectedProcedure
      .input(z.object({
        eventId: z.string(),
        entityType: z.enum(["contact", "account", "deal"]),
        entityId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { linkEventToEntity } = await import("./calendar-sync");
        await linkEventToEntity(input.eventId, input.entityType, input.entityId);
        return { success: true };
      }),

    captureMeetingNotes: protectedProcedure
      .input(z.object({
        eventId: z.string(),
        notes: z.string(),
        outcome: z.enum(["successful", "rescheduled", "cancelled", "no_show"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { captureMeetingNotes } = await import("./calendar-sync");
        return captureMeetingNotes(input.eventId, input.notes, input.outcome);
      }),

    linkAttendees: protectedProcedure
      .input(z.object({
        eventId: z.string(),
        attendeeEmails: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const { linkAttendeesToContacts } = await import("./calendar-sync");
        return linkAttendeesToContacts(input.eventId, input.attendeeEmails);
      }),

    getAttendees: protectedProcedure
      .input(z.object({ eventId: z.string() }))
      .query(async ({ input }) => {
        const { getMeetingAttendees } = await import("./calendar-sync");
        return getMeetingAttendees(input.eventId);
      }),

    generateFollowUpTasks: protectedProcedure
      .input(z.object({
        eventId: z.string(),
        taskTemplates: z.array(z.object({
          title: z.string(),
          description: z.string().optional(),
          dueInDays: z.number(),
          priority: z.enum(["low", "medium", "high"]).optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { generateFollowUpTasks } = await import("./calendar-sync");
        return generateFollowUpTasks(input.eventId, input.taskTemplates);
      }),
    
    getUpcomingEvents: protectedProcedure
      .input(z.object({
        maxResults: z.number().optional().default(10),
      }))
      .query(async ({ input, ctx }) => {
        const { getUpcomingEvents } = await import("./googleCalendar");
        return getUpcomingEvents(ctx.user!.tenantId, input.maxResults);
      }),
    
    getStatus: protectedProcedure
      .query(async ({ ctx }) => {
        const { getCalendarStatus } = await import("./googleCalendar");
        return getCalendarStatus(ctx.user!.tenantId);
      }),

    // Demo Booking Endpoints
    getAvailability: protectedProcedure
      .input(z.object({
        salesManagerId: z.string(),
        date: z.string(), // ISO date string
      }))
      .query(async ({ input, ctx }) => {
        const date = new Date(input.date);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const bookings = await db.getDemoBookingsByManagerAndDate(
          ctx.user.tenantId,
          input.salesManagerId,
          startOfDay,
          endOfDay
        );

        // Generate time slots from 9 AM to 5 PM with 35-minute intervals (30 min demo + 5 min buffer)
        const WORKING_HOURS = { start: 9, end: 17 };
        const SLOT_INTERVAL = 35; // 30 min demo + 5 min buffer
        const slots: { time: string; available: boolean }[] = [];

        for (let hour = WORKING_HOURS.start; hour < WORKING_HOURS.end; hour++) {
          for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
            const slotStart = new Date(date);
            slotStart.setHours(hour, minute, 0, 0);
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + 30); // Demo duration

            // Check if this slot conflicts with any existing booking
            const hasConflict = bookings.some(booking => {
              const bookingStart = new Date(booking.startTime);
              const bookingEnd = new Date(booking.endTime);
              return (
                (slotStart >= bookingStart && slotStart < bookingEnd) ||
                (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
                (slotStart <= bookingStart && slotEnd >= bookingEnd)
              );
            });

            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            slots.push({ time: timeString, available: !hasConflict });
          }
        }

        return { slots, existingBookings: bookings };
      }),

    bookDemo: protectedProcedure
      .input(z.object({
        salesManagerId: z.string(),
        date: z.string(),
        time: z.string(),
        title: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const [hours, minutes] = input.time.split(':').map(Number);
        const startTime = new Date(input.date);
        startTime.setHours(hours, minutes, 0, 0);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 30);

        // Generate Google Meet link (simplified - in production use Google Calendar API)
        const meetId = Math.random().toString(36).substring(2, 5) + '-' +
                      Math.random().toString(36).substring(2, 6) + '-' +
                      Math.random().toString(36).substring(2, 5);
        const meetLink = `https://meet.google.com/${meetId}`;

        const booking = await db.createDemoBooking({
          tenantId: ctx.user.tenantId,
          salesManagerId: input.salesManagerId,
          bookedByUserId: ctx.user.id,
          title: input.title,
          description: input.description,
          startTime,
          endTime,
          meetLink,
        });

        return booking;
      }),

    listManagers: protectedProcedure
      .query(async ({ ctx }) => {
        // Get users with role "admin" or "owner" (sales managers)
        return db.getUsersByRoles(ctx.user.tenantId, ['admin', 'owner']);
      }),

    // ── Calendar View procedures ──────────────────────────────────────────────

    listAllUsers: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getAllUsersByTenant(ctx.user.tenantId);
      }),

    getBookingsForRange: protectedProcedure
      .input(z.object({
        startDate: z.string(), // ISO date string
        endDate: z.string(),   // ISO date string
        userId: z.string().optional(), // filter by specific user; omit for all
      }))
      .query(async ({ input, ctx }) => {
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        if (input.userId) {
          return db.getDemoBookingsByUserAndDateRange(
            ctx.user.tenantId,
            input.userId,
            start,
            end
          );
        }
        return db.getDemoBookingsByDateRange(ctx.user.tenantId, start, end);
      }),

    cancelBooking: protectedProcedure
      .input(z.object({ bookingId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await db.cancelDemoBooking(ctx.user.tenantId, input.bookingId);
        return { success: true };
      }),

    getBookingById: protectedProcedure
      .input(z.object({ bookingId: z.string() }))
      .query(async ({ input, ctx }) => {
        const booking = await db.getDemoBookingById(ctx.user.tenantId, input.bookingId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND' });
        return booking;
      }),
  }),
  
  documents: router({
    upload: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        fileBuffer: z.instanceof(Buffer),
        mimeType: z.string(),
        linkedEntityType: z.enum(["contact", "account", "deal", "task"]).optional(),
        linkedEntityId: z.string().optional(),
        folderId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { uploadDocument } = await import("./document-manager");
        return uploadDocument({
          ...input,
          tenantId: ctx.user.tenantId,
          uploadedById: ctx.user.id,
        });
      }),
    
    uploadVersion: protectedProcedure
      .input(z.object({
        documentId: z.string(),
        fileBuffer: z.instanceof(Buffer),
        changeNote: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { uploadDocumentVersion } = await import("./document-manager");
        return uploadDocumentVersion(
          input.documentId,
          input.fileBuffer,
          ctx.user.id,
          input.changeNote
        );
      }),
    
    list: protectedProcedure
      .input(z.object({ folderId: z.string().nullable().optional() }))
      .query(async ({ input, ctx }) => {
        const { getDocuments } = await import("./document-manager");
        return getDocuments(ctx.user.tenantId, input.folderId);
      }),
    
    getEntityDocuments: protectedProcedure
      .input(z.object({
        entityType: z.enum(["contact", "account", "deal", "task"]),
        entityId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        const { getEntityDocuments } = await import("./document-manager");
        return getEntityDocuments(ctx.user.tenantId, input.entityType, input.entityId);
      }),
    
    getVersions: protectedProcedure
      .input(z.object({ documentId: z.string() }))
      .query(async ({ input }) => {
        const { getDocumentVersions } = await import("./document-manager");
        return getDocumentVersions(input.documentId);
      }),
    
    delete: protectedProcedure
      .input(z.object({ documentId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { requireDeletePermission } = await import("./permissions");
        requireDeletePermission(ctx.user.role);
        const { deleteDocument } = await import("./document-manager");
        await deleteDocument(input.documentId);
        return { success: true };
      }),
    
    createFolder: protectedProcedure
      .input(z.object({
        name: z.string(),
        parentFolderId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createFolder } = await import("./document-manager");
        const folderId = await createFolder({
          ...input,
          tenantId: ctx.user.tenantId,
          createdById: ctx.user.id,
        });
        return { folderId };
      }),
    
    listFolders: protectedProcedure
      .input(z.object({ parentFolderId: z.string().nullable().optional() }))
      .query(async ({ input, ctx }) => {
        const { getFolders } = await import("./document-manager");
        return getFolders(ctx.user.tenantId, input.parentFolderId);
      }),
    
    deleteFolder: protectedProcedure
      .input(z.object({ folderId: z.string() }))
      .mutation(async ({ input }) => {
        const { deleteFolder } = await import("./document-manager");
        await deleteFolder(input.folderId);
        return { success: true };
      }),
  }),
  
  reports: router({
    generatePipeline: protectedProcedure
      .input(z.object({ format: z.enum(["pdf", "excel"]) }))
      .mutation(async ({ input, ctx }) => {
        const { generatePipelineReport } = await import("./report-generator");
        return generatePipelineReport(ctx.user.tenantId, input.format);
      }),
    
    generateCampaign: protectedProcedure
      .input(z.object({
        format: z.enum(["pdf", "excel"]),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { generateCampaignReport } = await import("./report-generator");
        return generateCampaignReport(
          ctx.user.tenantId,
          input.format,
          input.startDate,
          input.endDate
        );
      }),
    
    generateActivity: protectedProcedure
      .input(z.object({
        format: z.enum(["pdf", "excel"]),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { generateActivityReport } = await import("./report-generator");
        return generateActivityReport(
          ctx.user.tenantId,
          input.format,
          input.startDate,
          input.endDate
        );
      }),
    
    scheduleReport: protectedProcedure
      .input(z.object({
        reportType: z.enum(["pipeline", "campaign", "activity"]),
        format: z.enum(["pdf", "excel"]),
        frequency: z.enum(["daily", "weekly", "monthly"]),
        emailTo: z.array(z.string().email()),
      }))
      .mutation(async ({ input, ctx }) => {
        const { scheduleReport } = await import("./report-generator");
        return scheduleReport({
          ...input,
          tenantId: ctx.user.tenantId,
        });
      }),
  }),
  
  leadScoring: router({
    getTopLeads: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const { getTopLeads } = await import("./db-lead-scoring");
        return getTopLeads(ctx.user.tenantId, input.limit);
      }),
    
    getScoreForPerson: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input, ctx }) => {
        const { getLeadScoreForPerson } = await import("./db-lead-scoring");
        return getLeadScoreForPerson(ctx.user.tenantId, input.personId);
      }),
    
    calculateScore: protectedProcedure
      .input(z.object({
        personId: z.string(),
        accountId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await import("./db");
        const { scoreContact } = await import("./lead-scoring");
        const { saveLeadScore } = await import("./db-lead-scoring");
        
        // Get person and account data
        const person = await db.getPersonById(input.personId);
        if (!person) throw new Error("Person not found");
        
        let account = null;
        if (input.accountId) {
          account = await db.getAccountById(input.accountId);
        }
        
        // Get recent events (moments)
        const moments = await db.getMomentsByTenant(ctx.user.tenantId);
        const events = moments.map((m: any) => ({
          type: m.type,
          timestamp: new Date(m.timestamp),
        }));
        
        // Calculate scores
        const scores = await scoreContact(person, account, events);
        
        // Save to database
        await saveLeadScore({
          tenantId: ctx.user.tenantId,
          personId: input.personId,
          fitScore: scores.fitScore,
          intentScore: scores.intentScore,
          combinedScore: scores.combinedScore,
        });
        
        return scores;
      }),
    
    getRules: protectedProcedure
      .query(async ({ ctx }) => {
        const { getScoringRules } = await import("./db-lead-scoring");
        return getScoringRules(ctx.user.tenantId);
      }),
    
    createRule: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        category: z.enum(["engagement", "demographic", "behavior"]),
        eventType: z.string(),
        points: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { upsertScoringRule } = await import("./db-lead-scoring");
        const ruleId = await upsertScoringRule({
          tenantId: ctx.user.tenantId,
          ...input,
        });
        return { ruleId };
      }),
    
    updateRule: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        points: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { upsertScoringRule } = await import("./db-lead-scoring");
        await upsertScoringRule({
          id: input.id,
          tenantId: ctx.user.tenantId,
          name: input.name || "",
          category: "engagement", // Required but not changing
          eventType: "", // Required but not changing
          points: input.points || 0,
          isActive: input.isActive,
        });
        return { success: true };
      }),
    
    deleteRule: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const { deleteScoringRule } = await import("./db-lead-scoring");
        await deleteScoringRule(input.id);
        return { success: true };
      }),
  }),
  
  emailTemplates: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const { getTemplatesByTenant } = await import("./db-templates");
        return getTemplatesByTenant(ctx.user.tenantId);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const { getTemplateById } = await import("./db-templates");
        return getTemplateById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        subject: z.string(),
        content: z.array(z.object({
          type: z.enum(["text", "image", "button", "divider", "spacer"]),
          content: z.string().optional(),
          styles: z.record(z.string(), z.any()).optional(),
          url: z.string().optional(),
          alt: z.string().optional(),
        })),
        variables: z.array(z.string()).optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createTemplate } = await import("./db-templates");
        const templateId = await createTemplate({
          tenantId: ctx.user.tenantId,
          createdById: ctx.user.id,
          ...input,
        });
        return { templateId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        subject: z.string().optional(),
        content: z.array(z.object({
          type: z.enum(["text", "image", "button", "divider", "spacer"]),
          content: z.string().optional(),
          styles: z.record(z.string(), z.any()).optional(),
          url: z.string().optional(),
          alt: z.string().optional(),
        })).optional(),
        variables: z.array(z.string()).optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateTemplate } = await import("./db-templates");
        const { id, ...data } = input;
        await updateTemplate(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { requireDeletePermission } = await import("./permissions");
        requireDeletePermission(ctx.user.role);
        const { deleteTemplate } = await import("./db-templates");
        await deleteTemplate(input.id);
        return { success: true };
      }),
    
    duplicate: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { duplicateTemplate } = await import("./db-templates");
        const newId = await duplicateTemplate(input.id, ctx.user.tenantId, ctx.user.id);
        return { templateId: newId };
      }),
    
    render: protectedProcedure
      .input(z.object({
        id: z.string(),
        variables: z.record(z.string(), z.string()),
      }))
      .query(async ({ input }) => {
        const { getTemplateById, renderTemplate } = await import("./db-templates");
        const template = await getTemplateById(input.id);
        if (!template) throw new Error("Template not found");
        const variables: Record<string, string> = {};
        Object.entries(input.variables).forEach(([key, value]) => {
          variables[key] = String(value);
        });
        return renderTemplate(template, variables);
      }),
  }),
  
  tasks: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const { getTasksByTenant } = await import("./db-tasks");
        return getTasksByTenant(ctx.user.tenantId);
      }),
    
    getByAssignee: protectedProcedure
      .input(z.object({
        assignedToId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        const { getTasksByAssignee } = await import("./db-tasks");
        return getTasksByAssignee(ctx.user.tenantId, input.assignedToId);
      }),
    
    getByEntity: protectedProcedure
      .input(z.object({
        entityType: z.enum(["deal", "contact", "account"]),
        entityId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        const { getTasksByEntity } = await import("./db-tasks");
        return getTasksByEntity(ctx.user.tenantId, input.entityType, input.entityId);
      }),
    
    getOverdue: protectedProcedure
      .query(async ({ ctx }) => {
        const { getOverdueTasks } = await import("./db-tasks");
        return getOverdueTasks(ctx.user.tenantId);
      }),
    
    getDueToday: protectedProcedure
      .query(async ({ ctx }) => {
        const { getTasksByTenant } = await import("./db-tasks");
        const tasks = await getTasksByTenant(ctx.user.tenantId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return tasks.filter((task: any) => {
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          return dueDate >= today && dueDate < tomorrow;
        });
      }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        dueDate: z.date().optional(),
        assignedToId: z.string().optional(),
        linkedEntityType: z.enum(["deal", "contact", "account"]).optional(),
        linkedEntityId: z.string().optional(),
        reminderAt: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createTask } = await import("./db-tasks");
        const taskId = await createTask({
          tenantId: ctx.user.tenantId,
          createdById: ctx.user.id,
          ...input,
        });
        return { taskId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        taskId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["todo", "in_progress", "completed", "cancelled"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        dueDate: z.date().optional(),
        assignedToId: z.string().optional(),
        reminderAt: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateTask } = await import("./db-tasks");
        const { taskId, ...data } = input;
        await updateTask(taskId, data);
        return { success: true };
      }),
    
    complete: protectedProcedure
      .input(z.object({
        taskId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { completeTask } = await import("./db-tasks");
        await completeTask(input.taskId);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({
        taskId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { requireDeletePermission } = await import("./permissions");
        requireDeletePermission(ctx.user.role);
        const { deleteTask } = await import("./db-tasks");
        await deleteTask(input.taskId);
        return { success: true };
      }),
    
    setReminder: protectedProcedure
      .input(z.object({
        taskId: z.string(),
        reminderAt: z.date(),
      }))
      .mutation(async ({ input }) => {
        const { updateTask } = await import("./db-tasks");
        await updateTask(input.taskId, { reminderAt: input.reminderAt, reminderSent: false });
        return { success: true };
      }),
    
    getUpcomingReminders: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUpcomingReminders } = await import("./task-reminders");
        return getUpcomingReminders(ctx.user.id, ctx.user.tenantId);
      }),
  }),
  
  bulkImport: router({
    parseCSV: protectedProcedure
      .input(z.object({
        content: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { parseCSV } = await import("./bulk-import");
        const rows = parseCSV(input.content);
        return {
          success: true,
          rowCount: rows.length,
          headers: rows.length > 0 ? Object.keys(rows[0]) : [],
          preview: rows.slice(0, 5),
        };
      }),
    
    getAvailableFields: protectedProcedure
      .query(async () => {
        const { getAvailableCRMFields } = await import("./bulk-import");
        return getAvailableCRMFields();
      }),
    
    importContacts: protectedProcedure
      .input(z.object({
        content: z.string(),
        mapping: z.array(z.object({
          csvColumn: z.string(),
          crmField: z.string(),
        })),
        skipDuplicates: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const { parseCSV, importContacts } = await import("./bulk-import");
        const rows = parseCSV(input.content);
        const result = await importContacts(
          ctx.user.tenantId,
          rows,
          input.mapping,
          input.skipDuplicates
        );
        return result;
      }),
  }),

  deals: router({
    listStages: protectedProcedure
      .query(async ({ ctx }) => {
        const { getDealStagesByTenant } = await import("./db-deals");
        return getDealStagesByTenant(ctx.user.tenantId);
      }),
    
    createStage: protectedProcedure
      .input(z.object({
        name: z.string(),
        order: z.number(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createDealStage } = await import("./db-deals");
        return createDealStage({ tenantId: ctx.user.tenantId, ...input });
      }),
    
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const { getDealsByTenant } = await import("./db-deals");
        return getDealsByTenant(ctx.user.tenantId);
      }),
    
    get: protectedProcedure
      .input(z.object({ dealId: z.string() }))
      .query(async ({ input, ctx }) => {
        const { getDealById } = await import("./db-deals");
        const deal = await getDealById(input.dealId, ctx.user.tenantId);
        if (!deal) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        }
        return deal;
      }),
    
    listByStage: protectedProcedure
      .input(z.object({ stageId: z.string() }))
      .query(async ({ input, ctx }) => {
        const { getDealsByStage } = await import("./db-deals");
        return getDealsByStage(ctx.user.tenantId, input.stageId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        value: z.string().optional(),
        currency: z.string().optional(),
        stageId: z.string(),
        accountId: z.string().optional(),
        contactId: z.string().optional(),
        ownerUserId: z.string().optional(),
        expectedCloseDate: z.date().optional(),
        probability: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { checkDuplicateDeal } = await import("./duplicate-detection");
        
        const duplicateCheck = await checkDuplicateDeal(
          ctx.user.tenantId,
          input.name,
          input.accountId || null
        );
        
        if (duplicateCheck.isDuplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: duplicateCheck.reason || "A duplicate deal already exists.",
            cause: {
              existingRecordId: duplicateCheck.existingRecordId,
              existingRecordName: duplicateCheck.existingRecordName,
            },
          });
        }
        
        const { createDeal } = await import("./db-deals");
        return createDeal({ tenantId: ctx.user.tenantId, ...input });
      }),
    
    updateStage: protectedProcedure
      .input(z.object({
        dealId: z.string(),
        newStageId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { updateDealStage } = await import("./db-deals");
        return updateDealStage(input.dealId, ctx.user.tenantId, input.newStageId);
      }),
    
    update: protectedProcedure
      .input(z.object({
        dealId: z.string(),
        name: z.string().optional(),
        value: z.string().optional(),
        currency: z.string().optional(),
        stageId: z.string().optional(),
        accountId: z.string().optional(),
        contactId: z.string().optional(),
        ownerUserId: z.string().optional(),
        expectedCloseDate: z.date().optional(),
        probability: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { updateDeal } = await import("./db-deals");
        const { dealId, ...data } = input;
        return updateDeal(dealId, ctx.user.tenantId, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ dealId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { requireDeletePermission } = await import("./permissions");
        requireDeletePermission(ctx.user.role);
        const { deleteDeal } = await import("./db-deals");
        return deleteDeal(input.dealId, ctx.user.tenantId);
      }),
    
    initializeStages: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { initializeDefaultStages } = await import("./db-deals");
        return initializeDefaultStages(ctx.user.tenantId);
      }),
  }),
  
  notes: router({
    create: protectedProcedure
      .input(z.object({
        content: z.string(),
        entityType: z.enum(["contact", "account", "deal", "task", "thread"]),
        entityId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createNote({
          tenantId: ctx.user.tenantId,
          content: input.content,
          entityType: input.entityType,
          entityId: input.entityId,
          createdBy: ctx.user.id,
          createdByName: ctx.user.name || ctx.user.email,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        noteId: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.updateNote(
          input.noteId,
          input.content,
          ctx.user.id,
          ctx.user.name || ctx.user.email
        );
      }),
    
    list: protectedProcedure
      .input(z.object({
        entityType: z.enum(["contact", "account", "deal", "task", "thread"]),
        entityId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        return db.getNotesByEntity(
          ctx.user.tenantId,
          input.entityType,
          input.entityId
        );
      }),
    
    delete: protectedProcedure
      .input(z.object({ noteId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { requireDeletePermission } = await import("./permissions");
        requireDeletePermission(ctx.user.role);
        await db.deleteNote(input.noteId, ctx.user.tenantId);
        return { success: true };
      }),
    
    contextual: protectedProcedure
      .input(z.object({
        entityType: z.enum(["contact", "account", "deal", "task", "thread"]),
        entityId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        return db.getContextualNotes({
          tenantId: ctx.user.tenantId,
          entityType: input.entityType,
          entityId: input.entityId,
        });
      }),
  }),
  
  savedFilters: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        viewType: z.enum(["deals", "contacts", "accounts", "tasks"]),
        filters: z.record(z.string(), z.any()),
        sortBy: z.string().optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
        isPublic: z.boolean().optional(),
        sharedWithUserIds: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createSavedFilter({
          tenantId: ctx.user.tenantId,
          createdById: ctx.user.id,
          ...input,
        });
      }),
    
    list: protectedProcedure
      .input(z.object({
        viewType: z.enum(["deals", "contacts", "accounts", "tasks"]).optional(),
      }))
      .query(async ({ input, ctx }) => {
        return db.getSavedFilters(
          ctx.user.tenantId,
          ctx.user.id,
          input.viewType
        );
      }),
    
    update: protectedProcedure
      .input(z.object({
        filterId: z.string(),
        name: z.string().optional(),
        filters: z.record(z.string(), z.any()).optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
        isPublic: z.boolean().optional(),
        sharedWithUserIds: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { filterId, ...data } = input;
        return db.updateSavedFilter(filterId, ctx.user.tenantId, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ filterId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteSavedFilter(input.filterId, ctx.user.tenantId);
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

  search: router({
    global: protectedProcedure
      .input(z.object({
        query: z.string().min(2),
      }))
      .query(async ({ input, ctx }) => {
        const query = `%${input.query}%`;
        const tenantId = ctx.user.tenantId;
        
        // Search people
        const people = await db.searchPeople(tenantId, query);
        
        // Search accounts
        const accounts = await db.searchAccounts(tenantId, query);
        
        // Search threads
        const threads = await db.searchThreads(tenantId, query);
        
        return {
          people: people.slice(0, 5),
          accounts: accounts.slice(0, 5),
          threads: threads.slice(0, 5),
        };
      }),
  }),

  assignment: router({
    getTeamMembers: protectedProcedure.query(async ({ ctx }) => {
      return db.getTeamMembers(ctx.user.tenantId);
    }),

    assignPeople: protectedProcedure
      .input(z.object({
        personIds: z.array(z.string()),
        userId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.assignPeopleToUser(input.personIds, input.userId, ctx.user.tenantId);
        return { success: true };
      }),

    unassignPeople: protectedProcedure
      .input(z.object({
        personIds: z.array(z.string()),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.unassignPeople(input.personIds, ctx.user.tenantId);
        return { success: true };
      }),
  }),

  tags: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getAllTags(ctx.user.tenantId);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createTag(ctx.user.tenantId, input.name, input.color);
      }),

    delete: protectedProcedure
      .input(z.object({ tagId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteTag(input.tagId, ctx.user.tenantId);
        return { success: true };
      }),

    addToPeople: protectedProcedure
      .input(z.object({
        personIds: z.array(z.string()),
        tagId: z.string(),
      }))
      .mutation(async ({ input }) => {
        for (const personId of input.personIds) {
          await db.addTagToPerson(personId, input.tagId);
        }
        return { success: true };
      }),

    removeFromPerson: protectedProcedure
      .input(z.object({
        personId: z.string(),
        tagId: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.removeTagFromPerson(input.personId, input.tagId);
        return { success: true };
      }),

    getPersonTags: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input }) => {
        return db.getPersonTags(input.personId);
      }),

    addToAccounts: protectedProcedure
      .input(z.object({
        accountIds: z.array(z.string()),
        tagId: z.string(),
      }))
      .mutation(async ({ input }) => {
        for (const accountId of input.accountIds) {
          await db.addTagToAccount(accountId, input.tagId);
        }
        return { success: true };
      }),

    removeFromAccount: protectedProcedure
      .input(z.object({
        accountId: z.string(),
        tagId: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.removeTagFromAccount(input.accountId, input.tagId);
        return { success: true };
      }),

    getAccountTags: protectedProcedure
      .input(z.object({ accountId: z.string() }))
      .query(async ({ input }) => {
        return db.getAccountTags(input.accountId);
      }),
  }),

  emailTracking: router({
    recordEvent: protectedProcedure
      .input(z.object({
        emailId: z.string(),
        personId: z.string().optional(),
        eventType: z.enum(["sent", "delivered", "opened", "clicked", "bounced", "unsubscribed"]),
        clickedUrl: z.string().optional(),
        userAgent: z.string().optional(),
        ipAddress: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.recordEmailTrackingEvent({
          tenantId: ctx.user.tenantId,
          ...input,
        });
        return { success: true };
      }),

    getStats: protectedProcedure
      .input(z.object({ emailId: z.string() }))
      .query(async ({ input }) => {
        return db.getEmailTrackingStats(input.emailId);
      }),

    getPersonStats: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input, ctx }) => {
        return db.getPersonEmailStats(input.personId, ctx.user.tenantId);
      }),
  }),

  activities: router({
    create: protectedProcedure
      .input(z.object({
        personId: z.string().optional(),
        accountId: z.string().optional(),
        activityType: z.enum(["email", "call", "meeting", "note", "task", "deal_stage_change", "tag_added", "assignment_changed"]),
        title: z.string(),
        description: z.string().optional(),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createActivity({
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),

    getByPerson: protectedProcedure
      .input(z.object({
        personId: z.string(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        return db.getActivitiesByPerson(input.personId, ctx.user.tenantId, input.limit);
      }),

    getByAccount: protectedProcedure
      .input(z.object({
        accountId: z.string(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        return db.getActivitiesByAccount(input.accountId, ctx.user.tenantId, input.limit);
      }),

    getByType: protectedProcedure
      .input(z.object({
        activityType: z.string(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        return db.getActivitiesByType(ctx.user.tenantId, input.activityType, input.limit);
      }),
  }),

  aiEmail: router({
    generate: protectedProcedure
      .input(z.object({
        contactId: z.string().optional(),
        dealId: z.string().optional(),
        accountId: z.string().optional(),
        purpose: z.string(),
        tone: z.string().optional(),
        additionalContext: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { generateEmail } = await import("./ai-email");
        return generateEmail({
          tenantId: ctx.user.tenantId,
          ...input,
        });
      }),
    
    improve: protectedProcedure
      .input(z.object({
        subject: z.string(),
        body: z.string(),
        improvementType: z.enum(["clarity", "tone", "length", "cta", "personalization"]),
        targetTone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { improveEmail } = await import("./ai-email");
        return improveEmail(input);
      }),
  }),

  integrations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getIntegrationsByTenant(ctx.user.tenantId);
    }),
  }),

  webhooks: router({
    listEvents: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(50),
        status: z.enum(["processed", "failed", "pending"]).optional(),
      }))
      .query(async ({ input, ctx }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { webhookEvents } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        
        let query = dbInstance
          .select()
          .from(webhookEvents)
          .where(eq(webhookEvents.tenantId, ctx.user!.tenantId))
          .orderBy(desc(webhookEvents.createdAt))
          .limit(input.limit);
        
        const events = await query;
        return events;
      }),
    
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { webhookEvents } = await import("../drizzle/schema");
        const { eq, isNotNull, isNull, sql } = await import("drizzle-orm");
        
        const allEvents = await dbInstance
          .select()
          .from(webhookEvents)
          .where(eq(webhookEvents.tenantId, ctx.user!.tenantId));
        
        const total = allEvents.length;
        const processed = allEvents.filter(e => e.processedAt).length;
        const failed = allEvents.filter(e => e.error).length;
        const pending = allEvents.filter(e => !e.processedAt && !e.error).length;
        
        return { total, processed, failed, pending };
      }),
  }),

});
export type AppRouter = typeof appRouter;
