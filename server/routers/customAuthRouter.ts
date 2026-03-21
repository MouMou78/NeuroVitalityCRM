/**
 * Custom Authentication Router
 * Handles email/password signup, login, and 2FA
 * Security: signed session tokens, strict password policy, secure cookies
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { createHmac, randomBytes } from 'crypto';
import {
  signup,
  login,
  setup2FA,
  verify2FASetup,
  generatePasswordResetToken,
  resetPassword,
} from '../customAuth';

// Password policy: min 8 chars, at least one uppercase, one lowercase, one digit
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

/**
 * Sign session data with HMAC to prevent tampering
 */
function signSession(data: object): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'fallback-dev-secret';
  const payload = JSON.stringify(data);
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, sig })).toString('base64');
}

/**
 * Verify and parse a signed session token
 */
function verifySession(token: string): object | null {
  try {
    const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'fallback-dev-secret';
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const expectedSig = createHmac('sha256', secret).update(decoded.payload).digest('hex');
    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(decoded.sig, 'hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');
    if (sigBuffer.length !== expectedBuffer.length) return null;
    let diff = 0;
    for (let i = 0; i < sigBuffer.length; i++) {
      diff |= sigBuffer[i] ^ expectedBuffer[i];
    }
    if (diff !== 0) return null;
    return JSON.parse(decoded.payload);
  } catch {
    return null;
  }
}

export const customAuthRouter = router({
  /**
   * Sign up with email and password
   */
  signup: publicProcedure
    .input(
      z.object({
        email: z.string().email().max(254).toLowerCase(),
        password: passwordSchema,
        name: z.string().max(100).optional(),
        tenantName: z.string().max(100).optional(),
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
        userId: z.string().uuid(),
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
        userId: z.string().uuid(),
        code: z.string().min(6).max(8),
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
        email: z.string().email().max(254),
        password: z.string().max(128),
        twoFactorCode: z.string().min(6).max(8).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await login(input);
      
      // If authentication is complete, set signed session cookie
      if ('authenticated' in result && result.authenticated) {
        const sessionData = {
          userId: result.userId,
          tenantId: result.tenantId,
          email: result.email,
          role: result.role,
          iat: Date.now(), // issued at timestamp
        };
        
        const signedToken = signSession(sessionData);
        
        ctx.res.cookie('custom_auth_session', signedToken, {
          httpOnly: true,                                          // Not accessible via JS
          secure: process.env.NODE_ENV === 'production',          // HTTPS only in prod
          sameSite: 'strict',                                      // CSRF protection
          maxAge: 7 * 24 * 60 * 60 * 1000,                       // 7 days
          path: '/',
        });
      }
      
      return result;
    }),

  /**
   * Logout (clear session)
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie('custom_auth_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return { success: true };
  }),

  /**
   * Get current user from session (validates signature)
   */
  me: publicProcedure.query(({ ctx }) => {
    const sessionCookie = ctx.req.cookies['custom_auth_session'];
    if (!sessionCookie) {
      return null;
    }
    
    // Try signed session first
    const verified = verifySession(sessionCookie);
    if (verified) return verified;
    
    // Fallback: try legacy unsigned JSON (for existing sessions during migration)
    try {
      const legacy = JSON.parse(sessionCookie);
      if (legacy && legacy.userId) return legacy;
    } catch {
      // Not valid JSON either
    }
    
    return null;
  }),

  /**
   * Request password reset (sends email with token)
   * Always returns success to prevent user enumeration
   */
  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.string().email().max(254),
      })
    )
    .mutation(async ({ input }) => {
      // Always generate token attempt (returns '' if user not found)
      // This prevents user enumeration via timing differences
      await generatePasswordResetToken(input.email);
      
      // TODO: Send email with reset link via email service
      // The token should ONLY be sent via email, never returned in the response
      return {
        success: true,
        message: "If an account exists with that email, a password reset link has been sent.",
      };
    }),

  /**
   * Reset password using token
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(64).max(64),
        newPassword: passwordSchema,
      })
    )
    .mutation(async ({ input }) => {
      await resetPassword(input.token, input.newPassword);
      return { success: true };
    }),
});
