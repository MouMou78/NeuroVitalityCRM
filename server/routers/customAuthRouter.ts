/**
 * Custom Authentication Router
 * Handles email/password signup, login, and 2FA
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  signup,
  login,
  setup2FA,
  verify2FASetup,
  generatePasswordResetToken,
  resetPassword,
} from '../customAuth';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export const customAuthRouter = router({
  /**
   * Sign up with email and password
   */
  signup: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
        tenantName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await signup(input);
    }),

  /**
   * Setup 2FA for a user (returns QR code and backup codes)
   */
  setup2FA: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await setup2FA(input.userId);
    }),

  /**
   * Verify 2FA setup and enable 2FA
   */
  verify2FASetup: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        code: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await verify2FASetup(input.userId, input.code);
    }),

  /**
   * Login with email and password
   * Returns requires2FA: true if 2FA code is needed
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
        twoFactorCode: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await login(input);
      
      // If authentication is complete, set session cookie
      if ('authenticated' in result && result.authenticated) {
        // Create session token (simplified - in production use JWT or secure session)
        const sessionData = {
          userId: result.userId,
          tenantId: result.tenantId,
          email: result.email,
          name: result.name,
          role: result.role,
        };
        
        // Set cookie (using existing cookie infrastructure)
        ctx.res.cookie('custom_auth_session', JSON.stringify(sessionData), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }
      
      return result;
    }),

  /**
   * Logout (clear session)
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie('custom_auth_session');
    return { success: true };
  }),

  /**
   * Get current user from session (includes live twoFactorEnabled status)
   */
  me: publicProcedure.query(async ({ ctx }) => {
    const sessionCookie = ctx.req.cookies['custom_auth_session'];
    if (!sessionCookie) {
      return null;
    }
    
    try {
      const session = JSON.parse(sessionCookie);
      // Fetch live user record to get up-to-date twoFactorEnabled status
      const db = await getDb();
      if (db && session.userId) {
        const userResults = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            tenantId: users.tenantId,
            twoFactorEnabled: users.twoFactorEnabled,
            disabled: users.disabled,
          })
          .from(users)
          .where(eq(users.id, session.userId))
          .limit(1);
        if (userResults.length > 0) {
          const u = userResults[0];
          return {
            userId: u.id,
            email: u.email,
            name: u.name || '',
            role: u.role,
            tenantId: u.tenantId,
            twoFactorEnabled: u.twoFactorEnabled,
          };
        }
      }
      return session;
    } catch {
      return null;
    }
  }),

  /**
   * Request password reset (sends email with token)
   */
  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const token = await generatePasswordResetToken(input.email);
      
      // TODO: Send email with reset link
      // For now, return token (in production, send via email)
      return {
        success: true,
        // Remove this in production - token should only be sent via email
        token: process.env.NODE_ENV === 'development' ? token : undefined,
      };
    }),

  /**
   * Reset password using token
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      await resetPassword(input.token, input.newPassword);
      return { success: true };
    }),
});
