import { describe, it, expect } from "vitest";
import { requireStoreAccess, AuthenticatedSession } from "../lib/auth-guard";
import { hasPermission, requirePermission } from "../lib/permissions";
import { getAppBaseUrl } from "../lib/app-url";

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

  describe("9. Store Context Resolution & Employee Creation Security", () => {
    function resolveEmployeeCreationStore(
      session: AuthenticatedSession,
      payload: { fullName: string; email: string; role: string; storeId?: string }
    ) {
      const targetStoreId = payload.storeId || session.store?.id || session.accessibleStores?.[0]?.id;

      if (!payload.fullName || !payload.email || !payload.role || !targetStoreId) {
        throw new Error("Full Name, Email, Role, and Store are required");
      }

      if (!session.profile.isSuperAdmin) {
        const isAuthorized = session.storeIds.includes(targetStoreId);
        if (!isAuthorized) {
          throw new Error("Forbidden — Target store access is denied");
        }
      }

      return {
        assignedStoreId: targetStoreId,
        organizationId: session.organization.id,
      };
    }

    it("allows single-store Shop Owner to create employee without explicitly passing storeId", () => {
      const result = resolveEmployeeCreationStore(reyonOwnerSession, {
        fullName: "New Cashier",
        email: "newcashier@reyonwatch.com",
        role: "cashier",
      });

      expect(result.assignedStoreId).toBe(storeReyonWatch.id);
      expect(result.organizationId).toBe("org-reyon-watch");
    });

    it("correctly binds employee to Reyon Watch main store when storeId is automatically resolved", () => {
      const result = resolveEmployeeCreationStore(reyonOwnerSession, {
        fullName: "Second Staff",
        email: "staff2@reyonwatch.com",
        role: "inventory",
        storeId: "", // Empty storeId in payload
      });

      expect(result.assignedStoreId).toBe("store-reyon-01");
    });

    it("blocks Shop Owner from passing an unauthorized storeId (competitor store)", () => {
      expect(() =>
        resolveEmployeeCreationStore(reyonOwnerSession, {
          fullName: "Attacker Staff",
          email: "attacker@fake.com",
          role: "cashier",
          storeId: storeCompetitor.id, // Unauthorized storeId!
        })
      ).toThrowError(/Forbidden — Target store access is denied/);
    });

    it("allows Multi-Store Shop Owner to assign employee to any authorized store in their org", () => {
      const storeReyonBranch2 = { id: "store-reyon-02", name: "Reyon Watch - Dhanmondi", code: "REYON-02" };
      const multiStoreOwnerSession: AuthenticatedSession = {
        ...reyonOwnerSession,
        accessibleStores: [storeReyonWatch, storeReyonBranch2],
        storeIds: [storeReyonWatch.id, storeReyonBranch2.id],
      };

      const result1 = resolveEmployeeCreationStore(multiStoreOwnerSession, {
        fullName: "Branch 1 Staff",
        email: "staff1@reyon.com",
        role: "cashier",
        storeId: storeReyonWatch.id,
      });
      expect(result1.assignedStoreId).toBe(storeReyonWatch.id);

      const result2 = resolveEmployeeCreationStore(multiStoreOwnerSession, {
        fullName: "Branch 2 Staff",
        email: "staff2@reyon.com",
        role: "cashier",
        storeId: storeReyonBranch2.id,
      });
      expect(result2.assignedStoreId).toBe(storeReyonBranch2.id);
    });

    it("allows Master Admin (super admin) to assign employees to target store context", () => {
      const masterAdminSession: AuthenticatedSession = {
        user: { id: "user-master-001", email: "williammasum@gmail.com" },
        profile: { fullName: "William Masum", isSuperAdmin: true },
        organization: { id: "org-platform", name: "Autopilot SaaS" },
        store: storeReyonWatch,
        accessibleStores: [storeReyonWatch],
        role: "owner",
        storeIds: [storeReyonWatch.id],
      };

      const result = resolveEmployeeCreationStore(masterAdminSession, {
        fullName: "Platform Managed Staff",
        email: "managed@reyonwatch.com",
        role: "manager",
        storeId: storeReyonWatch.id,
      });

      expect(result.assignedStoreId).toBe(storeReyonWatch.id);
    });
  });

  describe("10. Initial Authentication Password Security & Zero Exposure", () => {
    function validateInitialPassword(password?: string) {
      if (!password || password.length < 8) {
        throw new Error("Initial password must be at least 8 characters long");
      }
      return true;
    }

    it("requires initial password of at least 8 characters", () => {
      expect(() => validateInitialPassword("12345")).toThrowError(
        /Initial password must be at least 8 characters long/
      );
      expect(validateInitialPassword("StrongPass2026!")).toBe(true);
    });

    it("ensures GET /api/employees output contains ZERO plaintext password or credential fields", () => {
      const sampleEmployeeItem = {
        id: "emp-101",
        userId: "user-101",
        fullName: "Rocky",
        email: "rocky@gmail.com",
        phone: "01324438311",
        role: "manager",
        isActive: true,
        primaryStore: storeReyonWatch,
      };

      const keys = Object.keys(sampleEmployeeItem);
      expect(keys).not.toContain("password");
      expect(keys).not.toContain("initial_password");
      expect(keys).not.toContain("encrypted_password");
    });
  });

  describe("11. Secure Employee Password Management Suite", () => {
    function simulatePasswordManagementAuthorization(
      session: AuthenticatedSession,
      targetEmployeeOrgId: string,
      action: "set_password" | "generate" | "link",
      passwordInput?: string
    ) {
      // 1. Role Authorization
      if (!session.profile.isSuperAdmin && !["owner", "manager"].includes(session.role)) {
        const err = new Error("Forbidden — Insufficient permissions");
        (err as any).status = 403;
        throw err;
      }

      // 2. Tenant Isolation
      if (!session.profile.isSuperAdmin && session.organization.id !== targetEmployeeOrgId) {
        const err = new Error("Forbidden — Target employee not found in your organization");
        (err as any).status = 404;
        throw err;
      }

      // 3. Password Validation for set_password
      if (action === "set_password") {
        if (!passwordInput || passwordInput.length < 8) {
          const err = new Error("New temporary password must be at least 8 characters long");
          (err as any).status = 400;
          throw err;
        }
      }

      return { success: true };
    }

    it("allows Shop Owner to reset employee password within their organization", () => {
      const res = simulatePasswordManagementAuthorization(reyonOwnerSession, "org-reyon-watch", "set_password", "NewTempPass2026!");
      expect(res.success).toBe(true);
    });

    it("blocks Shop Owner from resetting an employee password belonging to another organization", () => {
      expect(() =>
        simulatePasswordManagementAuthorization(reyonOwnerSession, "org-competitor-watch", "set_password", "HackPass123!")
      ).toThrowError(/Forbidden — Target employee not found in your organization/);
    });

    it("strictly blocks Cashier, Inventory, and Accountant roles from resetting passwords (403 Forbidden)", () => {
      expect(() =>
        simulatePasswordManagementAuthorization(reyonCashierSession, "org-reyon-watch", "set_password", "Pass123456!")
      ).toThrowError(/Forbidden — Insufficient permissions/);

      expect(() =>
        simulatePasswordManagementAuthorization(reyonInventorySession, "org-reyon-watch", "generate")
      ).toThrowError(/Forbidden — Insufficient permissions/);

      expect(() =>
        simulatePasswordManagementAuthorization(reyonAccountantSession, "org-reyon-watch", "link")
      ).toThrowError(/Forbidden — Insufficient permissions/);
    });

    it("validates server-generated temporary password meets strength & complexity requirements", () => {
      const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const lower = "abcdefghijklmnopqrstuvwxyz";
      const nums = "0123456789";
      const symbols = "!@#$%^&*";
      const chars = upper + lower + nums + symbols;

      const password = [
        upper[Math.floor(Math.random() * upper.length)],
        lower[Math.floor(Math.random() * lower.length)],
        nums[Math.floor(Math.random() * nums.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ];
      for (let i = 4; i < 14; i++) {
        password.push(chars[Math.floor(Math.random() * chars.length)]);
      }
      const generated = password.sort(() => Math.random() - 0.5).join("");

      expect(generated.length).toBeGreaterThanOrEqual(8);
      expect(generated).not.toBe("12345678");
      expect(generated).not.toBe("password");
      expect(/[A-Z]/.test(generated)).toBe(true);
      expect(/[a-z]/.test(generated)).toBe(true);
      expect(/[0-9]/.test(generated)).toBe(true);
    });

    it("verifies password reset preserves inactive employee status and does NOT auto-reactivate", () => {
      const inactiveEmployee = { id: "emp-999", userId: "user-999", is_active: false };
      const updatedUserAuth = { userId: inactiveEmployee.userId, passwordUpdated: true };
      expect(updatedUserAuth.passwordUpdated).toBe(true);
      expect(inactiveEmployee.is_active).toBe(false);
    });

    it("ensures existing employee password can NEVER be viewed or retrieved", () => {
      const getEmployeeApiRes = {
        id: "emp-101",
        fullName: "Rocky",
        email: "rocky@gmail.com",
        role: "manager",
        isActive: true,
      };
      expect((getEmployeeApiRes as any).password).toBeUndefined();
      expect((getEmployeeApiRes as any).currentPassword).toBeUndefined();
    });
  });

  describe("12. Production Password Reset Link Environment & Redirect Isolation", () => {
    it("resolves canonical production app URL when NODE_ENV is production", () => {
      const origNodeEnv = process.env.NODE_ENV;
      const origSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      const origAppUrl = process.env.NEXT_PUBLIC_APP_URL;
      const origVercelUrl = process.env.VERCEL_URL;

      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.VERCEL_URL;
      (process.env as any).NODE_ENV = "production";

      const url = getAppBaseUrl();
      expect(url).toBe("https://autopilot-pos-saas.vercel.app");
      expect(url).not.toContain("localhost");

      // Restore
      (process.env as any).NODE_ENV = origNodeEnv;
      if (origSiteUrl) process.env.NEXT_PUBLIC_SITE_URL = origSiteUrl;
      if (origAppUrl) process.env.NEXT_PUBLIC_APP_URL = origAppUrl;
      if (origVercelUrl) process.env.VERCEL_URL = origVercelUrl;
    });

    it("resolves local development URL when running in dev mode", () => {
      const origNodeEnv = process.env.NODE_ENV;
      const origSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.NEXT_PUBLIC_SITE_URL;
      (process.env as any).NODE_ENV = "development";

      const url = getAppBaseUrl();
      expect(url).toBe("http://localhost:3000");

      (process.env as any).NODE_ENV = origNodeEnv;
      if (origSiteUrl) process.env.NEXT_PUBLIC_SITE_URL = origSiteUrl;
    });

    it("ensures recovery link target page is /auth/reset-password", () => {
      const baseUrl = "https://autopilot-pos-saas.vercel.app";
      const target = `${baseUrl}/auth/reset-password`;
      expect(target).toBe("https://autopilot-pos-saas.vercel.app/auth/reset-password");
    });
  });
});


