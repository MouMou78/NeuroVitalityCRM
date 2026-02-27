import { TRPCError } from "@trpc/server";

export type UserRole =
  | "engineering"
  | "owner"
  | "admin"
  | "manager"
  | "sales"
  | "operations"
  | "collaborator"
  | "user"
  | "restricted";

const ROLE_HIERARCHY: Record<string, number> = {
  engineering: 100,
  owner: 80,
  admin: 60,
  manager: 40,
  sales: 30,
  operations: 30,
  collaborator: 20,
  user: 10,
  restricted: 0,
};

export function hasMinRole(userRole: string, minRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const minLevel = ROLE_HIERARCHY[minRole] ?? 0;
  return userLevel >= minLevel;
}

export function canManageAIMemory(userRole: string): boolean {
  return userRole === "engineering";
}

export function canDelete(userRole: string): boolean {
  return hasMinRole(userRole, "admin");
}

export function canManageUsers(userRole: string): boolean {
  return hasMinRole(userRole, "owner");
}

export function canManageSettings(userRole: string): boolean {
  return hasMinRole(userRole, "admin");
}

export function canViewReports(userRole: string): boolean {
  return userRole !== "restricted";
}

export function canExportData(userRole: string): boolean {
  return hasMinRole(userRole, "manager");
}

export function requireDeletePermission(userRole: string) {
  if (!canDelete(userRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to delete records. Only administrators and above can delete data.",
    });
  }
}

export function requireUserManagementPermission(userRole: string) {
  if (!canManageUsers(userRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to manage users. Only owners and above can manage user accounts.",
    });
  }
}

export function requireSettingsPermission(userRole: string) {
  if (!canManageSettings(userRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to manage settings. Only administrators and above can modify settings.",
    });
  }
}

export function requireAIMemoryPermission(userRole: string) {
  if (!canManageAIMemory(userRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "AI Memory governance is restricted to the Engineering role. Contact your platform administrator.",
    });
  }
}

export function getRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    engineering: "Engineering",
    owner: "Owner",
    admin: "Administrator",
    manager: "Manager",
    sales: "Sales",
    operations: "Operations",
    collaborator: "Collaborator",
    user: "User",
    restricted: "Restricted",
  };
  return roleNames[role] || "User";
}

export function getRoleBadgeColour(role: string): string {
  const colours: Record<string, string> = {
    engineering: "bg-violet-100 text-violet-800 border-violet-200",
    owner: "bg-amber-100 text-amber-800 border-amber-200",
    admin: "bg-blue-100 text-blue-800 border-blue-200",
    manager: "bg-green-100 text-green-800 border-green-200",
    sales: "bg-cyan-100 text-cyan-800 border-cyan-200",
    operations: "bg-orange-100 text-orange-800 border-orange-200",
    collaborator: "bg-slate-100 text-slate-700 border-slate-200",
    user: "bg-gray-100 text-gray-700 border-gray-200",
    restricted: "bg-red-100 text-red-700 border-red-200",
  };
  return colours[role] || "bg-gray-100 text-gray-700 border-gray-200";
}
