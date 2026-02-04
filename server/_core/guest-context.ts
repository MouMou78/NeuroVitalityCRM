import type { TrpcContext } from "./context";

// Guest user for demo/testing without OAuth
const GUEST_USER = {
  id: "guest-user-id",
  tenantId: "guest-tenant-id",
  email: "guest@kompasscrm.demo",
  passwordHash: "not-used",
  name: "Guest User",
  role: "owner" as const,
  twoFactorSecret: null,
  twoFactorEnabled: false,
  backupCodes: null,
  passwordResetToken: null,
  passwordResetExpires: null,
  createdAt: new Date(),
};

export function createGuestContext(req: any, res: any): TrpcContext {
  return {
    user: GUEST_USER,
    req,
    res,
  };
}
