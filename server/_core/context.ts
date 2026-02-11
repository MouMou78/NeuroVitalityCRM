import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { createGuestContext } from "./guest-context";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Use custom authentication with session cookies
  let user: User | null = null;

  try {
    // Check for custom auth session cookie
    const sessionCookie = opts.req.cookies?.['custom_auth_session'];
    if (sessionCookie) {
      const sessionData = JSON.parse(sessionCookie);
      // Fetch user from database using session data
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
  } catch (error) {
    // Authentication is optional for public procedures
    console.error('Auth error:', error);
    user = null;
  }

  // If no user found, return mock guest user for development
  if (!user) {
    user = {
      id: 'guest-user-id',
      tenantId: 'default-tenant',
      email: 'demo@whitelabelcrm.com',
      passwordHash: '',
      name: 'Demo User',
      role: 'admin',
      twoFactorSecret: null,
      twoFactorEnabled: false,
      backupCodes: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      disabled: false,
      createdAt: new Date(),
    };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
  
  /* Original OAuth flow - disabled for guest access
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
  */
}
