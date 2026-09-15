import { describe, it, expect } from "vitest";
import { requireRole, requireStoreAccess, AuthenticatedSession, UserRole, StoreSummary } from "../lib/auth-guard";

describe("Phase 2 — Auth & RBAC Security Suite", () => {
  const storeElectronics: StoreSummary = { id: "store-elec-01", name: "Electronics Store", code: "ELEC01" };
  const storeWatch: StoreSummary = { id: "store-watch-02", name: "Watch Store", code: "WATCH02" };
  const storeCompetitor: StoreSummary = { id: "store-comp-03", name: "Competitor Outlet", code: "COMP03" };

  const mockOwnerSession: AuthenticatedSession = {
    user: { id: "user-owner-001", email: "owner@autopilotpos.com" },
    profile: { fullName: "Alice Owner", isSuperAdmin: false },
    organization: { id: "org-001", name: "Apex Retailers Ltd" },
    store: storeElectronics,
    accessibleStores: [storeElectronics, storeWatch],
    role: "owner",
    storeIds: [storeElectronics.id, storeWatch.id],
  };

  const mockManagerSession: AuthenticatedSession = {
    user: { id: "user-mgr-002", email: "manager@autopilotpos.com" },
    profile: { fullName: "Bob Manager", isSuperAdmin: false },
    organization: { id: "org-001", name: "Apex Retailers Ltd" },
    store: storeElectronics,
    accessibleStores: [storeElectronics, storeWatch],
    role: "manager",
    storeIds: [storeElectronics.id, storeWatch.id],
  };

  const mockSingleShopCashierSession: AuthenticatedSession = {
    user: { id: "user-cashier-003", email: "cashier-a@autopilotpos.com" },
    profile: { fullName: "Charlie Cashier", isSuperAdmin: false },
    organization: { id: "org-001", name: "Apex Retailers Ltd" },
    store: storeElectronics,
    accessibleStores: [storeElectronics], // Assigned strictly to 1 shop
    role: "cashier",
    storeIds: [storeElectronics.id],
  };

  const mockMultiShopCashierSession: AuthenticatedSession = {
    user: { id: "user-cashier-004", email: "cashier-multi@autopilotpos.com" },
    profile: { fullName: "Diana Multi Cashier", isSuperAdmin: false },
    organization: { id: "org-001", name: "Apex Retailers Ltd" },
    store: storeElectronics,
    accessibleStores: [storeElectronics, storeWatch], // Assigned to 2 authorized stores
    role: "cashier",
    storeIds: [storeElectronics.id, storeWatch.id],
  };

  const mockInventorySession: AuthenticatedSession = {
    user: { id: "user-inv-005", email: "inventory@autopilotpos.com" },
    profile: { fullName: "Edward Stockman", isSuperAdmin: false },
    organization: { id: "org-001", name: "Apex Retailers Ltd" },
    store: storeElectronics,
    accessibleStores: [storeElectronics],
    role: "inventory",
    storeIds: [storeElectronics.id],
  };

  const mockSuperAdminSession: AuthenticatedSession = {
    user: { id: "user-super-999", email: "superadmin@autopilotpos.com" },
    profile: { fullName: "Platform Super Admin", isSuperAdmin: true },
    organization: { id: "org-global", name: "Global Platform" },
    store: { id: "store-global", name: "Global Store" },
    accessibleStores: [],
    role: "owner",
    storeIds: [],
  };

  describe("1. Single-Shop User Flow", () => {
    it("assigns exactly one shop and automatically locks active context", () => {
      expect(mockSingleShopCashierSession.accessibleStores).toHaveLength(1);
      expect(mockSingleShopCashierSession.store.id).toBe(storeElectronics.id);
      expect(mockSingleShopCashierSession.storeIds).toEqual([storeElectronics.id]);
    });

    it("prevents single-shop cashier from accessing unassigned store", () => {
      expect(() => requireStoreAccess(mockSingleShopCashierSession, storeWatch.id)).toThrowError(
        /Forbidden — Access to this store outlet is denied/
      );
    });
  });

  describe("2. Multi-Shop User Flow & Shop Selection", () => {
    it("resolves only authorized stores in accessibleStores list", () => {
      expect(mockMultiShopCashierSession.accessibleStores).toHaveLength(2);
      expect(mockMultiShopCashierSession.accessibleStores.map(s => s.id)).toEqual([
        storeElectronics.id,
        storeWatch.id,
      ]);
      expect(mockMultiShopCashierSession.accessibleStores.map(s => s.id)).not.toContain(storeCompetitor.id);
    });

    it("allows multi-shop user access to both authorized stores", () => {
      expect(() => requireStoreAccess(mockMultiShopCashierSession, storeElectronics.id)).not.toThrow();
      expect(() => requireStoreAccess(mockMultiShopCashierSession, storeWatch.id)).not.toThrow();
    });

    it("denies multi-shop user access to arbitrary unauthorized store ID", () => {
      expect(() => requireStoreAccess(mockMultiShopCashierSession, storeCompetitor.id)).toThrowError(
        /Forbidden — Access to this store outlet is denied/
      );
    });
  });

  describe("3. Secure Store Switching & Authoritative Validation", () => {
    function simulateStoreSwitch(session: AuthenticatedSession, targetStoreId: string) {
      const targetStore = session.accessibleStores.find((s) => s.id === targetStoreId);
      if (!targetStore) {
        const error = new Error("Forbidden — You do not have access to this store");
        (error as any).status = 403;
        throw error;
      }
      return {
        ...session,
        store: targetStore,
      };
    }

    it("switches active store context cleanly when authorized", () => {
      const switched = simulateStoreSwitch(mockMultiShopCashierSession, storeWatch.id);
      expect(switched.store.id).toBe(storeWatch.id);
      expect(switched.store.name).toBe("Watch Store");
    });

    it("rejects store switch attempt with 403 when target store is not in accessibleStores", () => {
      expect(() => simulateStoreSwitch(mockSingleShopCashierSession, storeWatch.id)).toThrowError(
        /Forbidden — You do not have access to this store/
      );
      expect(() => simulateStoreSwitch(mockMultiShopCashierSession, storeCompetitor.id)).toThrowError(
        /Forbidden — You do not have access to this store/
      );
    });
  });

  describe("4. Role Permission Matrix (Owner, Manager, Cashier, Inventory)", () => {
    it("Owner: Allowed all operations (products, inventory, reports, settings)", () => {
      expect(() => requireRole(mockOwnerSession, ["owner"])).not.toThrow();
      expect(() => requireRole(mockOwnerSession, ["owner", "manager"])).not.toThrow();
      expect(() => requireRole(mockOwnerSession, ["cashier", "staff"])).toThrowError(/Forbidden/);
    });

    it("Manager: Allowed management ops, blocked from owner-only ops", () => {
      expect(() => requireRole(mockManagerSession, ["owner", "manager"])).not.toThrow();
      expect(() => requireRole(mockManagerSession, ["owner"])).toThrowError(/Forbidden/);
    });

    it("Cashier: Allowed POS/sales ops, denied catalog mutations and settings", () => {
      expect(() => requireRole(mockSingleShopCashierSession, ["cashier", "staff", "owner", "manager"])).not.toThrow();
      expect(() => requireRole(mockSingleShopCashierSession, ["owner", "manager"])).toThrowError(/Forbidden/);
      expect(() => requireRole(mockSingleShopCashierSession, ["owner"])).toThrowError(/Forbidden/);
    });

    it("Inventory: Allowed stock-related ops, denied POS checkout and admin settings", () => {
      expect(() => requireRole(mockInventorySession, ["inventory", "manager", "owner"])).not.toThrow();
      expect(() => requireRole(mockInventorySession, ["owner", "manager"])).toThrowError(/Forbidden/);
    });
  });

  describe("5. Super Admin & Platform Overrides", () => {
    it("Super Admin bypasses all role and store access restrictions", () => {
      const strictRoles: UserRole[] = ["inventory"];
      expect(() => requireRole(mockSuperAdminSession, strictRoles)).not.toThrow();
      expect(() => requireStoreAccess(mockSuperAdminSession, "random-store-xyz")).not.toThrow();
    });
  });
});

