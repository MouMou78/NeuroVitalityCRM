import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { createHmac } from "crypto";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Verify and parse a signed session token (mirrors customAuthRouter.verifySession)
 * Returns parsed session data or null if invalid/tampered
 */
function verifySessionToken(token: string): { userId: string; tenantId: string; email: string; role: string } | null {
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

// BYPASS AUTH: Mock user for demo mode — matches client-side useAuth bypass
const MOCK_USER: User = {
  id: 'guest-user-id',
  tenantId: 'guest-tenant-id',
  email: 'ian@neurovitalityltd.com',
  passwordHash: '',
  name: 'Ian',
  role: 'owner',
  twoFactorSecret: null,
  twoFactorEnabled: false,
  backupCodes: null,
  passwordResetToken: null,
  passwordResetExpires: null,
  disabled: false,
  createdAt: new Date(),
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // BYPASS AUTH: Always return mock user — real auth disabled for demo mode
  // When real auth is needed, remove this block and uncomment the session logic below
  return {
    req: opts.req,
    res: opts.res,
    user: MOCK_USER,
  };

  /* --- Real auth (disabled for demo mode) ---
  let user: User | null = null;

  try {
    const sessionCookie = opts.req.cookies?.['custom_auth_session'];
    if (sessionCookie) {
      // Try signed session token first (new format)
      let sessionData = verifySessionToken(sessionCookie);

      // Fallback: legacy unsigned JSON (for existing sessions during migration window)
      if (!sessionData) {
        try {
          const legacy = JSON.parse(sessionCookie);
          if (legacy && legacy.userId) {
            sessionData = legacy;
          }
        } catch {
          // Not valid JSON either — reject
        }
      }

      if (sessionData?.userId) {
        const { getDb } = await import('../db');
        const { users: userTable } = await import('../../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        const db = await getDb();
        if (db) {
          const users = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, sessionData.userId))
            .limit(1);

          if (users.length > 0) {
            user = users[0];
          }
        }
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
  */
}
