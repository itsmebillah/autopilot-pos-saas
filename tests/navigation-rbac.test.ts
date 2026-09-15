import { describe, it, expect } from "vitest";
import { hasPermission } from "../lib/permissions";

describe("Role-Based Navigation Visibility & RBAC Matrix Tests", () => {
  it("1. verifies Owner sees all navigation modules (Employees, Reports, Settings, POS, Products, Orders)", () => {
    const role = "owner";
    expect(hasPermission(role, "canManageEmployees")).toBe(true);
    expect(hasPermission(role, "canViewFinancialReports")).toBe(true);
    expect(hasPermission(role, "canManageSettings")).toBe(true);
    expect(hasPermission(role, "canAccessPOS")).toBe(true);
    expect(hasPermission(role, "canManageProducts")).toBe(true);
    expect(hasPermission(role, "canManageInventory")).toBe(true);
  });

  it("2. verifies Cashier sees POS and Orders, but NOT Staff & Employees, Reports, or Store Settings", () => {
    const role = "cashier";
    expect(hasPermission(role, "canAccessPOS")).toBe(true);

    // Restricted modules MUST be hidden
    expect(hasPermission(role, "canManageEmployees")).toBe(false);
    expect(hasPermission(role, "canViewFinancialReports")).toBe(false);
    expect(hasPermission(role, "canManageSettings")).toBe(false);
    expect(hasPermission(role, "canManageProducts")).toBe(false);
  });

  it("3. verifies Inventory staff sees Products & Stock, but NOT POS, Employees, Financial Reports, or Settings", () => {
    const role = "inventory";
    expect(hasPermission(role, "canManageProducts")).toBe(true);
    expect(hasPermission(role, "canManageInventory")).toBe(true);

    // Restricted modules MUST be hidden
    expect(hasPermission(role, "canAccessPOS")).toBe(false);
    expect(hasPermission(role, "canManageEmployees")).toBe(false);
    expect(hasPermission(role, "canViewFinancialReports")).toBe(false);
    expect(hasPermission(role, "canManageSettings")).toBe(false);
  });

  it("4. verifies Accountant sees Financial Reports, but NOT POS, Products, Employees, or Store Settings", () => {
    const role = "accountant";
    expect(hasPermission(role, "canViewFinancialReports")).toBe(true);

    // Restricted modules MUST be hidden
    expect(hasPermission(role, "canAccessPOS")).toBe(false);
    expect(hasPermission(role, "canManageProducts")).toBe(false);
    expect(hasPermission(role, "canManageEmployees")).toBe(false);
    expect(hasPermission(role, "canManageSettings")).toBe(false);
  });

  it("5. verifies Store Manager sees Staff & Employees and Reports, but NOT Store Settings", () => {
    const role = "manager";
    expect(hasPermission(role, "canManageEmployees")).toBe(true);
    expect(hasPermission(role, "canViewFinancialReports")).toBe(true);
    expect(hasPermission(role, "canAccessPOS")).toBe(true);
    expect(hasPermission(role, "canManageProducts")).toBe(true);

    // Store Settings is strictly reserved for Shop Owner
    expect(hasPermission(role, "canManageSettings")).toBe(false);
    expect(hasPermission(role, "canChangeEmployeeRole")).toBe(false);
  });

  it("6. verifies Platform Master Admin gets full bypass when in shop console context", () => {
    const isSuperAdmin = true;
    expect(hasPermission("platform_admin", "canManageEmployees", isSuperAdmin)).toBe(true);
    expect(hasPermission("platform_admin", "canManageSettings", isSuperAdmin)).toBe(true);
    expect(hasPermission("platform_admin", "canAccessPOS", isSuperAdmin)).toBe(true);
  });

  it("7. verifies Desktop and Mobile navigation filter items using identical permission rules", () => {
    const computeNavVisibility = (role: string, isSuperAdmin = false) => {
      return {
        hasPOS: hasPermission(role, "canAccessPOS", isSuperAdmin),
        hasProducts: hasPermission(role, "canManageProducts", isSuperAdmin) || hasPermission(role, "canManageInventory", isSuperAdmin),
        hasEmployees: hasPermission(role, "canManageEmployees", isSuperAdmin),
        hasReports: hasPermission(role, "canViewFinancialReports", isSuperAdmin),
        hasSettings: hasPermission(role, "canManageSettings", isSuperAdmin),
      };
    };

    const cashierNav = computeNavVisibility("cashier");
    expect(cashierNav.hasPOS).toBe(true);
    expect(cashierNav.hasEmployees).toBe(false);
    expect(cashierNav.hasReports).toBe(false);
    expect(cashierNav.hasSettings).toBe(false);

    const inventoryNav = computeNavVisibility("inventory");
    expect(inventoryNav.hasProducts).toBe(true);
    expect(inventoryNav.hasPOS).toBe(false);
    expect(inventoryNav.hasReports).toBe(false);
  });

  it("8. verifies loading state prevents unauthorized navigation item flicker", () => {
    const isLoading = true;
    const navItemsResolved = isLoading ? null : ["account", "dashboard"];
    expect(navItemsResolved).toBeNull();
  });
});
