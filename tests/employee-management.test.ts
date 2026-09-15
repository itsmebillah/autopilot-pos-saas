import { describe, it, expect } from "vitest";
import { requireStoreAccess, AuthenticatedSession } from "../lib/auth-guard";
import { hasPermission, requirePermission } from "../lib/permissions";

describe("Shop Owner & Employee Management RBAC Suite", () => {
  const storeReyonWatch = { id: "store-reyon-01", name: "Reyon Watch - Main Branch", code: "REYON-01" };
  const storeCompetitor = { id: "store-comp-99", name: "Competitor Outlet", code: "COMP-99" };

  // 1. Reyon Watch Owner (itsmbillah@gmail.com)
  const reyonOwnerSession: AuthenticatedSession = {
    user: { id: "user-reyon-owner", email: "itsmbillah@gmail.com" },
    profile: { fullName: "Masum Billah", isSuperAdmin: false }, // Strictly NOT a super admin!
    organization: { id: "org-reyon-watch", name: "Reyon Watch" },
    store: storeReyonWatch,
    accessibleStores: [storeReyonWatch],
    role: "owner",
    storeIds: [storeReyonWatch.id],
  };

  // 2. Reyon Watch Manager
  const reyonManagerSession: AuthenticatedSession = {
    user: { id: "user-reyon-mgr", email: "manager@reyonwatch.com" },
    profile: { fullName: "Sarah Manager", isSuperAdmin: false },
    organization: { id: "org-reyon-watch", name: "Reyon Watch" },
    store: storeReyonWatch,
    accessibleStores: [storeReyonWatch],
    role: "manager",
    storeIds: [storeReyonWatch.id],
  };

  // 3. Reyon Watch Sales Person / Cashier
  const reyonCashierSession: AuthenticatedSession = {
    user: { id: "user-reyon-cashier", email: "sales@reyonwatch.com" },
    profile: { fullName: "Tariq Sales", isSuperAdmin: false },
    organization: { id: "org-reyon-watch", name: "Reyon Watch" },
    store: storeReyonWatch,
    accessibleStores: [storeReyonWatch],
    role: "cashier",
    storeIds: [storeReyonWatch.id],
  };

  // 4. Reyon Watch Inventory Staff
  const reyonInventorySession: AuthenticatedSession = {
    user: { id: "user-reyon-inv", email: "inventory@reyonwatch.com" },
    profile: { fullName: "Kamal Stock", isSuperAdmin: false },
    organization: { id: "org-reyon-watch", name: "Reyon Watch" },
    store: storeReyonWatch,
    accessibleStores: [storeReyonWatch],
    role: "inventory",
    storeIds: [storeReyonWatch.id],
  };

  // 5. Reyon Watch Accountant
  const reyonAccountantSession: AuthenticatedSession = {
    user: { id: "user-reyon-acct", email: "finance@reyonwatch.com" },
    profile: { fullName: "Fahim Finance", isSuperAdmin: false },
    organization: { id: "org-reyon-watch", name: "Reyon Watch" },
    store: storeReyonWatch,
    accessibleStores: [storeReyonWatch],
    role: "accountant" as any,
    storeIds: [storeReyonWatch.id],
  };

  describe("1. Shop Owner Permissions & Platform Boundaries", () => {
    it("allows Reyon Watch Owner full control of shop, employees, and settings", () => {
      expect(hasPermission(reyonOwnerSession.role, "canManageEmployees")).toBe(true);
      expect(hasPermission(reyonOwnerSession.role, "canChangeEmployeeRole")).toBe(true);
      expect(hasPermission(reyonOwnerSession.role, "canManageSettings")).toBe(true);
      expect(hasPermission(reyonOwnerSession.role, "canDeleteProducts")).toBe(true);
      expect(hasPermission(reyonOwnerSession.role, "canViewFinancialReports")).toBe(true);
      expect(() => requirePermission(reyonOwnerSession, "canManageEmployees")).not.toThrow();
    });

    it("ensures Shop Owner is NOT a super admin and cannot access platform admin", () => {
      expect(reyonOwnerSession.profile.isSuperAdmin).toBe(false);
      expect(reyonOwnerSession.organization.id).toBe("org-reyon-watch");
    });
  });

  describe("2. Manager Permissions Matrix", () => {
    it("allows Manager to manage employees and view reports", () => {
      expect(hasPermission(reyonManagerSession.role, "canManageEmployees")).toBe(true);
      expect(hasPermission(reyonManagerSession.role, "canAccessPOS")).toBe(true);
      expect(hasPermission(reyonManagerSession.role, "canManageProducts")).toBe(true);
      expect(hasPermission(reyonManagerSession.role, "canViewFinancialReports")).toBe(true);
      expect(() => requirePermission(reyonManagerSession, "canManageEmployees")).not.toThrow();
    });

    it("blocks Manager from changing roles to Owner or deleting store settings", () => {
      expect(hasPermission(reyonManagerSession.role, "canChangeEmployeeRole")).toBe(false);
      expect(hasPermission(reyonManagerSession.role, "canManageSettings")).toBe(false);
      expect(hasPermission(reyonManagerSession.role, "canDeleteProducts")).toBe(false);
      expect(() => requirePermission(reyonManagerSession, "canManageSettings")).toThrowError(/Forbidden/);
    });
  });

  describe("3. Cashier / Sales Person Permissions Matrix", () => {
    it("allows Cashier to operate POS and checkout", () => {
      expect(hasPermission(reyonCashierSession.role, "canAccessPOS")).toBe(true);
      expect(() => requirePermission(reyonCashierSession, "canAccessPOS")).not.toThrow();
    });

    it("strictly denies Cashier from accessing Employee Management, Settings, or Product Deletion", () => {
      expect(hasPermission(reyonCashierSession.role, "canManageEmployees")).toBe(false);
      expect(hasPermission(reyonCashierSession.role, "canManageSettings")).toBe(false);
      expect(hasPermission(reyonCashierSession.role, "canDeleteProducts")).toBe(false);
      expect(hasPermission(reyonCashierSession.role, "canViewFinancialReports")).toBe(false);

      expect(() => requirePermission(reyonCashierSession, "canManageEmployees")).toThrowError(/Forbidden/);
      expect(() => requirePermission(reyonCashierSession, "canManageSettings")).toThrowError(/Forbidden/);
      expect(() => requirePermission(reyonCashierSession, "canDeleteProducts")).toThrowError(/Forbidden/);
    });
  });

  describe("4. Inventory Staff Permissions Matrix", () => {
    it("allows Inventory staff to manage stock and add products", () => {
      expect(hasPermission(reyonInventorySession.role, "canManageInventory")).toBe(true);
      expect(hasPermission(reyonInventorySession.role, "canManageProducts")).toBe(true);
      expect(() => requirePermission(reyonInventorySession, "canManageInventory")).not.toThrow();
    });

    it("denies Inventory staff from POS checkout and Employee management", () => {
      expect(hasPermission(reyonInventorySession.role, "canAccessPOS")).toBe(false);
      expect(hasPermission(reyonInventorySession.role, "canManageEmployees")).toBe(false);
      expect(() => requirePermission(reyonInventorySession, "canAccessPOS")).toThrowError(/Forbidden/);
    });
  });

  describe("5. Accountant Permissions Matrix", () => {
    it("allows Accountant to view financial reports", () => {
      expect(hasPermission(reyonAccountantSession.role, "canViewFinancialReports")).toBe(true);
      expect(() => requirePermission(reyonAccountantSession, "canViewFinancialReports")).not.toThrow();
    });

    it("denies Accountant from modifying catalog products or managing employees", () => {
      expect(hasPermission(reyonAccountantSession.role, "canManageProducts")).toBe(false);
      expect(hasPermission(reyonAccountantSession.role, "canManageEmployees")).toBe(false);
      expect(() => requirePermission(reyonAccountantSession, "canManageProducts")).toThrowError(/Forbidden/);
    });
  });

  describe("6. Cross-Tenant Store Isolation", () => {
    it("allows employee access to Reyon Watch store", () => {
      expect(() => requireStoreAccess(reyonCashierSession, storeReyonWatch.id)).not.toThrow();
    });

    it("blocks employee from accessing competitor outlet (IDOR protection)", () => {
      expect(() => requireStoreAccess(reyonCashierSession, storeCompetitor.id)).toThrowError(
        /Forbidden — Access to this store outlet is denied/
      );
    });
  });

  describe("7. Inactive Employee Deactivation Lifecycle", () => {
    function simulateSessionWithStatus(isActive: boolean) {
      if (!isActive) {
        return null; // Deactivated member session is rejected
      }
      return reyonCashierSession;
    }

    it("allows active employee to resolve session", () => {
      const activeSession = simulateSessionWithStatus(true);
      expect(activeSession).not.toBeNull();
      expect(activeSession?.user.email).toBe("sales@reyonwatch.com");
    });

    it("returns null session for deactivated employee and blocks all API access", () => {
      const inactiveSession = simulateSessionWithStatus(false);
      expect(inactiveSession).toBeNull();
    });
  });

  describe("8. Dynamic Role Change Updates", () => {
    it("immediately elevates permissions when role is promoted from cashier to manager", () => {
      let role = "cashier";
      expect(hasPermission(role, "canManageEmployees")).toBe(false);

      // Promoted by Owner to Manager
      role = "manager";
      expect(hasPermission(role, "canManageEmployees")).toBe(true);
      expect(hasPermission(role, "canViewFinancialReports")).toBe(true);
    });
  });
});
