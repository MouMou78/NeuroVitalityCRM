import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
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
        const result = await db
          .select()
          .from(userTable)
          .where(eq(userTable.id, sessionData.userId))
          .limit(1);
        
        if (result.length > 0) {
          user = result[0];
        }
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures
    console.error('Auth error:', error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
