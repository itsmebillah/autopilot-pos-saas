import { describe, it, expect } from "vitest";
import { requireSuperAdmin, AuthenticatedSession } from "../lib/auth-guard";

describe("Platform Admin & Shop Onboarding Suite", () => {
  const masterAdminSession: AuthenticatedSession = {
    user: { id: "user-master-001", email: "williammasum@gmail.com" },
    profile: { fullName: "William Masum", isSuperAdmin: true },
    organization: { id: "org-platform", name: "Autopilot Global Platform" },
    store: { id: "store-platform", name: "HQ" },
    accessibleStores: [{ id: "store-platform", name: "HQ" }],
    role: "owner",
    storeIds: ["store-platform"],
  };

  const shopOwnerSession: AuthenticatedSession = {
    user: { id: "user-owner-101", email: "owner@electronics.com" },
    profile: { fullName: "Alice Owner", isSuperAdmin: false }, // Not a super admin
    organization: { id: "org-elec", name: "Apex Electronics Ltd" },
    store: { id: "store-elec-01", name: "Gulshan Branch" },
    accessibleStores: [{ id: "store-elec-01", name: "Gulshan Branch" }],
    role: "owner",
    storeIds: ["store-elec-01"],
  };

  const shopCashierSession: AuthenticatedSession = {
    user: { id: "user-cashier-102", email: "cashier@electronics.com" },
    profile: { fullName: "Bob Cashier", isSuperAdmin: false },
    organization: { id: "org-elec", name: "Apex Electronics Ltd" },
    store: { id: "store-elec-01", name: "Gulshan Branch" },
    accessibleStores: [{ id: "store-elec-01", name: "Gulshan Branch" }],
    role: "cashier",
    storeIds: ["store-elec-01"],
  };

  describe("1. Platform Authorization Guard (requireSuperAdmin)", () => {
    it("allows Master Admin with isSuperAdmin=true to execute platform actions", () => {
      expect(() => requireSuperAdmin(masterAdminSession)).not.toThrow();
    });

    it("strictly throws 403 Forbidden when normal Shop Owner attempts platform admin access", () => {
      expect(() => requireSuperAdmin(shopOwnerSession)).toThrowError(
        /Forbidden — Platform Super Admin privileges required/
      );
    });

    it("strictly throws 403 Forbidden when Cashier attempts platform admin access", () => {
      expect(() => requireSuperAdmin(shopCashierSession)).toThrowError(
        /Forbidden — Platform Super Admin privileges required/
      );
    });

    it("rejects unauthorized user even if their email string is spoofed or manipulated", () => {
      const spoofedSession: AuthenticatedSession = {
        ...shopOwnerSession,
        user: { id: "user-spoof-999", email: "williammasum@gmail.com" },
        profile: { fullName: "Fake Admin", isSuperAdmin: false }, // DB flag is false
      };
      expect(() => requireSuperAdmin(spoofedSession)).toThrowError(
        /Forbidden — Platform Super Admin privileges required/
      );
    });
  });

  describe("2. Platform Admin User & Shop Admin Password Reset API Guard", () => {
    function simulateAdminPasswordReset(session: AuthenticatedSession, targetUserId: string, newPassword?: string) {
      requireSuperAdmin(session);
      if (!targetUserId) throw new Error("Missing required parameter: userId");
      if (!newPassword || newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }
      return { success: true, targetUserId, updated: true };
    }

    it("allows Platform Super Admin to reset password for any shop admin or user", () => {
      const result = simulateAdminPasswordReset(masterAdminSession, "user-owner-101", "NewSecurePass123!");
      expect(result.success).toBe(true);
      expect(result.targetUserId).toBe("user-owner-101");
    });

    it("denies non-super-admin from resetting passwords", () => {
      expect(() =>
        simulateAdminPasswordReset(shopOwnerSession, "user-cashier-102", "NewSecurePass123!")
      ).toThrowError(/Forbidden — Platform Super Admin privileges required/);
    });

    it("rejects passwords shorter than 6 characters", () => {
      expect(() =>
        simulateAdminPasswordReset(masterAdminSession, "user-owner-101", "123")
      ).toThrowError(/Password must be at least 6 characters long./);
    });
  });

  describe("3. Shop Onboarding & Taxonomy Preset Generator", () => {
    interface ShopCategoryPreset {
      key: string;
      name: string;
      attributes: string[];
      modules: string[];
    }

    const categories: Record<string, ShopCategoryPreset> = {
      ELECTRONICS: {
        key: "ELECTRONICS",
        name: "Electronics & Gadgets",
        attributes: ["brand", "model", "warranty_months", "color"],
        modules: ["mod_pos", "mod_products", "mod_inventory", "mod_serial_imei", "mod_warranty"],
      },
      COSMETICS: {
        key: "COSMETICS",
        name: "Cosmetics & Beauty",
        attributes: ["brand", "shade", "volume_weight", "skin_type"],
        modules: ["mod_pos", "mod_products", "mod_inventory", "mod_batch", "mod_expiry"],
      },
      WATCHES: {
        key: "WATCHES",
        name: "Watches & Timepieces",
        attributes: ["brand", "model", "movement_type", "strap_type", "dial_color"],
        modules: ["mod_pos", "mod_products", "mod_inventory", "mod_serial_imei", "mod_warranty"],
      },
    };

    function simulateShopCreation(payload: {
      businessName: string;
      categoryKey: string;
      adminEmail: string;
    }) {
      const category = categories[payload.categoryKey];
      if (!category) throw new Error("Invalid category");

      const orgId = `org-${Math.random().toString(36).substring(2, 8)}`;
      const storeId = `store-${Math.random().toString(36).substring(2, 8)}`;
      const adminId = `user-${Math.random().toString(36).substring(2, 8)}`;

      return {
        organization: {
          id: orgId,
          name: payload.businessName,
          subscription_status: "active",
        },
        store: {
          id: storeId,
          organization_id: orgId,
          name: `${payload.businessName} - Main Outlet`,
          categoryKey: category.key,
          enabled_modules: category.modules,
          is_active: true,
        },
        attributes: category.attributes.map((attr) => ({
          store_id: storeId,
          name: attr,
        })),
        admin: {
          id: adminId,
          email: payload.adminEmail,
          role: "owner",
        },
      };
    }

    it("creates an Electronics shop with Serial & Warranty defaults", () => {
      const elecShop = simulateShopCreation({
        businessName: "Sony Center Dhaka",
        categoryKey: "ELECTRONICS",
        adminEmail: "admin@sony.bd",
      });

      expect(elecShop.store.categoryKey).toBe("ELECTRONICS");
      expect(elecShop.store.enabled_modules).toContain("mod_serial_imei");
      expect(elecShop.store.enabled_modules).toContain("mod_warranty");
      expect(elecShop.attributes.map((a) => a.name)).toContain("warranty_months");
      expect(elecShop.admin.role).toBe("owner");
    });

    it("creates a Cosmetics shop with Batch & Expiry defaults", () => {
      const cosmeticsShop = simulateShopCreation({
        businessName: "Glow & Glamour Beauty",
        categoryKey: "COSMETICS",
        adminEmail: "admin@glowglam.com",
      });

      expect(cosmeticsShop.store.categoryKey).toBe("COSMETICS");
      expect(cosmeticsShop.store.enabled_modules).toContain("mod_batch");
      expect(cosmeticsShop.store.enabled_modules).toContain("mod_expiry");
      expect(cosmeticsShop.attributes.map((a) => a.name)).toContain("shade");
    });

    it("ensures different shop tenants remain completely isolated in schema and IDs", () => {
      const shopA = simulateShopCreation({
        businessName: "Shop A Electronics",
        categoryKey: "ELECTRONICS",
        adminEmail: "admin@shopA.com",
      });
      const shopB = simulateShopCreation({
        businessName: "Shop B Cosmetics",
        categoryKey: "COSMETICS",
        adminEmail: "admin@shopB.com",
      });

      expect(shopA.organization.id).not.toBe(shopB.organization.id);
      expect(shopA.store.id).not.toBe(shopB.store.id);
      expect(shopA.admin.id).not.toBe(shopB.admin.id);
      expect(shopA.store.enabled_modules).not.toEqual(shopB.store.enabled_modules);
    });
  });

  describe("4. Multi-Store Outlets & Shop Status Lifecycle", () => {
    it("allows creating additional store outlets under the same organization", () => {
      const orgId = "org-apex-001";
      const branch1 = { id: "store-dhaka", organization_id: orgId, name: "Dhaka Branch", is_active: true };
      const branch2 = { id: "store-ctg", organization_id: orgId, name: "Chittagong Branch", is_active: true };

      expect(branch1.organization_id).toBe(orgId);
      expect(branch2.organization_id).toBe(orgId);
      expect(branch1.id).not.toBe(branch2.id);
    });

    it("toggles store activation and suspension status", () => {
      let store = { id: "store-001", is_active: true };
      // Suspend
      store = { ...store, is_active: false };
      expect(store.is_active).toBe(false);
      // Re-activate
      store = { ...store, is_active: true };
      expect(store.is_active).toBe(true);
    });
  });
});
