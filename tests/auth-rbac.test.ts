import { describe, it, expect } from "vitest";
import { requireRole, requireStoreAccess, AuthenticatedSession, UserRole } from "../lib/auth-guard";

describe("Phase 2 — Auth & RBAC Security Suite", () => {
  const mockOwnerSession: AuthenticatedSession = {
    user: { id: "user-owner-001", email: "owner@autopilotpos.com" },
    profile: { fullName: "Alice Owner", isSuperAdmin: false },
    organization: { id: "org-001", name: "Apex Retailers Ltd" },
    store: { id: "store-001", name: "Main Branch" },
    role: "owner",
    storeIds: ["store-001", "store-002"],
  };

  const mockManagerSession: AuthenticatedSession = {
    user: { id: "user-mgr-002", email: "manager@autopilotpos.com" },
    profile: { fullName: "Bob Manager", isSuperAdmin: false },
    organization: { id: "org-001", name: "Apex Retailers Ltd" },
    store: { id: "store-001", name: "Main Branch" },
    role: "manager",
    storeIds: ["store-001"],
  };

  const mockCashierSessionStoreA: AuthenticatedSession = {
    user: { id: "user-cashier-003", email: "cashier-a@autopilotpos.com" },
    profile: { fullName: "Charlie Cashier", isSuperAdmin: false },
    organization: { id: "org-001", name: "Apex Retailers Ltd" },
    store: { id: "store-001", name: "Store A" },
    role: "cashier",
    storeIds: ["store-001"], // Only assigned to Store A
  };

  const mockSuperAdminSession: AuthenticatedSession = {
    user: { id: "user-super-999", email: "superadmin@autopilotpos.com" },
    profile: { fullName: "Platform Super Admin", isSuperAdmin: true },
    organization: { id: "org-global", name: "Global Platform" },
    store: { id: "store-global", name: "Global Store" },
    role: "owner",
    storeIds: [],
  };

  it("1. Allows Owner and Manager to access elevated inventory management actions", () => {
    const elevatedRoles: UserRole[] = ["owner", "manager", "inventory"];
    expect(() => requireRole(mockOwnerSession, elevatedRoles)).not.toThrow();
    expect(() => requireRole(mockManagerSession, elevatedRoles)).not.toThrow();
  });

  it("2. Denies Cashier from mutating catalog products or store settings", () => {
    const adminRoles: UserRole[] = ["owner", "manager"];
    expect(() => requireRole(mockCashierSessionStoreA, adminRoles)).toThrowError(
      /Forbidden — Insufficient permissions/
    );
  });

  it("3. Allows Cashier to operate in their assigned Store A", () => {
    expect(() => requireStoreAccess(mockCashierSessionStoreA, "store-001")).not.toThrow();
  });

  it("4. Denies Cashier from accessing Store B (Store Outlet Isolation)", () => {
    expect(() => requireStoreAccess(mockCashierSessionStoreA, "store-002")).toThrowError(
      /Forbidden — Access to this store outlet is denied/
    );
  });

  it("5. Allows Organization Owner to access all organization stores", () => {
    expect(() => requireStoreAccess(mockOwnerSession, "store-001")).not.toThrow();
    expect(() => requireStoreAccess(mockOwnerSession, "store-002")).not.toThrow();
    expect(() => requireStoreAccess(mockOwnerSession, "store-999")).not.toThrow();
  });

  it("6. Super Admin bypasses all role and store access restrictions", () => {
    const strictRoles: UserRole[] = ["inventory"];
    expect(() => requireRole(mockSuperAdminSession, strictRoles)).not.toThrow();
    expect(() => requireStoreAccess(mockSuperAdminSession, "random-store-xyz")).not.toThrow();
  });

  it("7. Validates role list membership correctly", () => {
    const staffSession: AuthenticatedSession = {
      ...mockCashierSessionStoreA,
      role: "staff",
    };
    expect(() => requireRole(staffSession, ["cashier", "staff"])).not.toThrow();
    expect(() => requireRole(staffSession, ["owner"])).toThrowError(/Forbidden/);
  });
});
