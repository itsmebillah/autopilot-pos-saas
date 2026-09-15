import { AuthenticatedSession, UserRole } from "./auth-guard";

export type PermissionKey =
  | "canManageEmployees"
  | "canChangeEmployeeRole"
  | "canDeactivateEmployee"
  | "canAccessPOS"
  | "canManageProducts"
  | "canDeleteProducts"
  | "canManageInventory"
  | "canViewFinancialReports"
  | "canManageSettings"
  | "canManageShifts";

export type ExtendedUserRole = UserRole | "accountant";

export const ROLE_PERMISSIONS: Record<ExtendedUserRole, PermissionKey[]> = {
  owner: [
    "canManageEmployees",
    "canChangeEmployeeRole",
    "canDeactivateEmployee",
    "canAccessPOS",
    "canManageProducts",
    "canDeleteProducts",
    "canManageInventory",
    "canViewFinancialReports",
    "canManageSettings",
    "canManageShifts",
  ],
  manager: [
    "canManageEmployees",
    "canDeactivateEmployee",
    "canAccessPOS",
    "canManageProducts",
    "canManageInventory",
    "canViewFinancialReports",
    "canManageShifts",
  ],
  cashier: [
    "canAccessPOS",
    "canManageShifts",
  ],
  staff: [
    "canAccessPOS",
    "canManageShifts",
  ],
  inventory: [
    "canManageProducts",
    "canManageInventory",
  ],
  accountant: [
    "canViewFinancialReports",
  ],
};

/**
 * Checks if a given role has a specific permission key.
 */
export function hasPermission(role: string, permission: PermissionKey): boolean {
  const roleKey = (role?.toLowerCase() as ExtendedUserRole) || "cashier";
  const permissions = ROLE_PERMISSIONS[roleKey] || [];
  return permissions.includes(permission);
}

/**
 * Enforces specific permission on authenticated session.
 * Super Admin always bypasses restrictions.
 */
export function requirePermission(session: AuthenticatedSession, permission: PermissionKey) {
  if (session.profile.isSuperAdmin) return;
  if (!hasPermission(session.role, permission)) {
    const error = new Error(`Forbidden — Insufficient permissions. Required action: [${permission}]`);
    (error as any).status = 403;
    throw error;
  }
}
