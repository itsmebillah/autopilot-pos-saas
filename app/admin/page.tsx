"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Store,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  RefreshCw,
  Tag,
  AlertTriangle,
} from "lucide-react";

interface MetricSummary {
  totalOrganizations: number;
  totalStores: number;
  activeStores: number;
  suspendedStores: number;
  totalUsers: number;
  totalCategories: number;
}

interface ShopCategory {
  id: string;
  key: string;
  name: string;
  description?: string;
  default_attributes?: Array<{
    name: string;
    label: string;
    data_type: string;
    is_required?: boolean;
    show_in_pos?: boolean;
  }>;
  default_modules?: string[];
}

interface OrganizationItem {
  id: string;
  businessName: string;
  slug: string;
  planTier: string;
  subscriptionStatus: string;
  createdAt: string;
  storeCount: number;
  userCount: number;
  primaryStore: {
    id: string;
    name: string;
    code: string;
    categoryName: string;
    categoryKey: string;
    isActive: boolean;
    phone?: string;
    address?: string;
    currency: string;
  } | null;
  stores: Array<{
    id: string;
    name: string;
    code: string;
    categoryName: string;
    categoryKey: string;
    isActive: boolean;
    createdAt: string;
  }>;
  admin: {
    fullName: string;
    phone?: string;
    role: string;
  };
}

export default function PlatformAdminDashboard() {
  const [metrics, setMetrics] = useState<MetricSummary | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [isCreateShopOpen, setIsCreateShopOpen] = useState(false);
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false);
  const [selectedOrgForStore, setSelectedOrgForStore] = useState<OrganizationItem | null>(null);

  // New Shop Form State
  const [shopStep, setShopStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [shopFormData, setShopFormData] = useState({
    businessName: "",
    legalName: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    currency: "BDT",
    currencyCode: "BDT",
    currencySymbol: "৳",
    timezone: "Asia/Dhaka",
    locale: "en-US",
    storeName: "",
    storeCode: "",
    shopCategoryId: "",
    adminFullName: "",
    adminEmail: "",
    adminPhone: "",
  });

  // Add Outlet Form State
  const [newStoreData, setNewStoreData] = useState({
    name: "",
    code: "",
    shopCategoryId: "",
    phone: "",
    email: "",
    address: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [metricsRes, orgsRes, catsRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch(`/api/admin/organizations?query=${encodeURIComponent(searchQuery)}&status=${statusFilter}`),
        fetch("/api/admin/categories"),
      ]);

      if (metricsRes.ok) {
        const m = await metricsRes.json();
        if (m.success) setMetrics(m.metrics);
      }

      if (orgsRes.ok) {
        const o = await orgsRes.json();
        if (o.success) setOrganizations(o.organizations);
      }

      if (catsRes.ok) {
        const c = await catsRes.json();
        if (c.success) {
          setCategories(c.categories);
          if (c.categories.length > 0 && !shopFormData.shopCategoryId) {
            setShopFormData((prev) => ({ ...prev, shopCategoryId: c.categories[0].id }));
          }
        }
      }
    } catch (err) {
      console.error("Failed to load platform data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Shop Creation Submit
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shopFormData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create shop");
      }

      setIsCreateShopOpen(false);
      setShopStep(1);
      setShopFormData({
        businessName: "",
        legalName: "",
        phone: "",
        email: "",
        website: "",
        address: "",
        currency: "BDT",
        currencyCode: "BDT",
        currencySymbol: "৳",
        timezone: "Asia/Dhaka",
        locale: "en-US",
        storeName: "",
        storeCode: "",
        shopCategoryId: categories[0]?.id || "",
        adminFullName: "",
        adminEmail: "",
        adminPhone: "",
      });
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Outlet Submit
  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgForStore) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/admin/stores/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrgForStore.id,
          ...newStoreData,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to add store outlet");
      }

      setIsAddStoreOpen(false);
      setSelectedOrgForStore(null);
      setNewStoreData({
        name: "",
        code: "",
        shopCategoryId: categories[0]?.id || "",
        phone: "",
        email: "",
        address: "",
      });
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Store Status (Activate / Suspend)
  const handleToggleStoreStatus = async (storeId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Status toggle error:", err);
    }
  };

  const selectedCategoryObj = categories.find((c) => c.id === shopFormData.shopCategoryId) || categories[0];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Platform Master Console
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Global multi-shop orchestration, tenant lifecycle, and shop onboarding engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            title="Refresh Data"
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw size={17} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => {
              setShopStep(1);
              setFormError(null);
              setIsCreateShopOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95"
          >
            <Plus size={18} />
            <span>Create New Shop</span>
          </button>
        </div>
      </div>

      {/* 6 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Orgs</span>
            <Building2 size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {metrics?.totalOrganizations ?? "--"}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Registered Businesses</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Shops</span>
            <Store size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {metrics?.totalStores ?? "--"}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Physical Outlets</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active</span>
            <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-green-600 dark:text-green-400">
            {metrics?.activeStores ?? "--"}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Operational</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Suspended</span>
            <XCircle size={18} className="text-red-500 dark:text-red-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-red-500 dark:text-red-400">
            {metrics?.suspendedStores ?? "--"}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Locked Outlets</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
            <Users size={18} className="text-violet-600 dark:text-violet-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {metrics?.totalUsers ?? "--"}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Staff & Admins</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Categories</span>
            <Layers size={18} className="text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {metrics?.totalCategories ?? categories.length}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Taxonomy Types</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search business, shop, category, admin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={15} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Businesses & Shops Table / Card List */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span>Managed Businesses & Outlets ({organizations.length})</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Real-time Tenant Partitioning
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="text-xs">Loading businesses and shop records...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="p-12 text-center">
            <Store size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Shops Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No registered organizations or shops match your search query. Click &quot;Create New Shop&quot; to onboard a business.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-6">Business & Outlet</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Admin Contact</th>
                  <th className="py-3.5 px-6 text-center">Outlets / Users</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {organizations.map((org) => {
                  const primaryStore = org.primaryStore;
                  const isActive = primaryStore ? primaryStore.isActive : org.subscriptionStatus === "active";

                  return (
                    <tr
                      key={org.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {org.businessName}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                          <Store size={12} className="text-indigo-500" />
                          <span>{primaryStore?.name || "Main Outlet"}</span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">
                            {primaryStore?.code || org.slug}
                          </code>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          <Tag size={12} className="text-indigo-500" />
                          {primaryStore?.categoryName || "General Retail"}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Suspended
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {org.admin.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {org.admin.phone || "No phone listed"}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-2 font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                          <span title="Store Outlets" className="text-blue-600 dark:text-blue-400">
                            {org.storeCount} stores
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">/</span>
                          <span title="Total Users" className="text-violet-600 dark:text-violet-400">
                            {org.userCount} users
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/shops/${org.id}`}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            View
                          </Link>

                          <button
                            onClick={() => {
                              setSelectedOrgForStore(org);
                              setNewStoreData({
                                name: "",
                                code: `STR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                                shopCategoryId: categories[0]?.id || "",
                                phone: "",
                                email: "",
                                address: "",
                              });
                              setIsAddStoreOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                          >
                            + Outlet
                          </button>

                          {primaryStore && (
                            <button
                              onClick={() => handleToggleStoreStatus(primaryStore.id, primaryStore.isActive)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                primaryStore.isActive
                                  ? "text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                  : "text-green-600 dark:text-green-400 hover:bg-green-500/10"
                              }`}
                            >
                              {primaryStore.isActive ? "Suspend" : "Activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE NEW SHOP MODAL */}
      {isCreateShopOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Onboard New Retail Shop
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Step {shopStep} of 3: {shopStep === 1 ? "Business Info" : shopStep === 2 ? "Shop & Category Taxonomy" : "Initial Shop Admin"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateShopOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Error Alert */}
            {formError && (
              <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateShop} className="p-6 space-y-5">
              {/* STEP 1: BUSINESS INFORMATION */}
              {shopStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Business Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Apex Electronics Ltd"
                        value={shopFormData.businessName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setShopFormData((prev) => ({
                            ...prev,
                            businessName: val,
                            storeName: prev.storeName || `${val} - Main Branch`,
                          }));
                        }}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Legal Entity Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Retail Private Limited"
                        value={shopFormData.legalName}
                        onChange={(e) => setShopFormData({ ...shopFormData, legalName: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="+8801700000000"
                        value={shopFormData.phone}
                        onChange={(e) => setShopFormData({ ...shopFormData, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="contact@business.com"
                        value={shopFormData.email}
                        onChange={(e) => setShopFormData({ ...shopFormData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Website
                      </label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={shopFormData.website}
                        onChange={(e) => setShopFormData({ ...shopFormData, website: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Currency
                      </label>
                      <select
                        value={shopFormData.currency}
                        onChange={(e) => {
                          const c = e.target.value;
                          const sym = c === "BDT" ? "৳" : c === "USD" ? "$" : c === "EUR" ? "€" : c === "GBP" ? "£" : c === "AED" ? "AED" : c;
                          setShopFormData({ ...shopFormData, currency: c, currencyCode: c, currencySymbol: sym });
                        }}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="BDT">BDT (৳ - Bangladeshi Taka)</option>
                        <option value="USD">USD ($ - US Dollar)</option>
                        <option value="EUR">EUR (€ - Euro)</option>
                        <option value="GBP">GBP (£ - British Pound)</option>
                        <option value="AED">AED (Dirham)</option>
                        <option value="SAR">SAR (Riyal)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Timezone
                      </label>
                      <select
                        value={shopFormData.timezone}
                        onChange={(e) => setShopFormData({ ...shopFormData, timezone: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                        <option value="UTC">UTC (Universal)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SHOP & CATEGORY SELECTION WITH LIVE PRESET PREVIEW */}
              {shopStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Initial Store / Outlet Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Apex Electronics - Gulshan Branch"
                        value={shopFormData.storeName}
                        onChange={(e) => setShopFormData({ ...shopFormData, storeName: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Shop Category *
                      </label>
                      <select
                        required
                        value={shopFormData.shopCategoryId}
                        onChange={(e) => setShopFormData({ ...shopFormData, shopCategoryId: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.key})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Category Taxonomy Preset Live Preview Box */}
                  {selectedCategoryObj && (
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                          <Layers size={14} />
                          <span>{selectedCategoryObj.name} Preset Configuration</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-200 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
                          {selectedCategoryObj.key}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {selectedCategoryObj.description || "Pre-configured industry attribute schemas and POS modules."}
                      </p>

                      {/* Enabled Attributes Preview */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                          Active Product Schema Attributes:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedCategoryObj.default_attributes || []).map((attr, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded-md text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
                            >
                              ✓ {attr.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Enabled Modules Preview */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                          Enabled POS Modules:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedCategoryObj.default_modules || []).map((mod, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                            >
                              {mod}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: INITIAL SHOP ADMIN */}
              {shopStep === 3 && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <Shield size={20} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Shop Admin Role Assignment
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        This user will be provisioned as the Owner of this shop tenant with full catalog, POS, inventory, and staff management permissions.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Shop Admin Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Jenkins"
                      value={shopFormData.adminFullName}
                      onChange={(e) => setShopFormData({ ...shopFormData, adminFullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Admin Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="admin@shop.com"
                        value={shopFormData.adminEmail}
                        onChange={(e) => setShopFormData({ ...shopFormData, adminEmail: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Admin Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="+8801800000000"
                        value={shopFormData.adminPhone}
                        onChange={(e) => setShopFormData({ ...shopFormData, adminPhone: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Step Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                {shopStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setShopStep(shopStep - 1)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {shopStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (shopStep === 1 && !shopFormData.businessName) {
                        setFormError("Business Name is required");
                        return;
                      }
                      if (shopStep === 2 && !shopFormData.storeName) {
                        setFormError("Store Name is required");
                        return;
                      }
                      setFormError(null);
                      setShopStep(shopStep + 1);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
                  >
                    <span>Next Step</span>
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-green-600/20 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Provisioning Shop...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Confirm & Provision Shop</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ADDITIONAL STORE OUTLET MODAL */}
      {isAddStoreOpen && selectedOrgForStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Add Store Outlet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Adding new branch to {selectedOrgForStore.businessName}
                </p>
              </div>

              <button
                onClick={() => setIsAddStoreOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddStore} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Outlet / Store Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chittagong Branch"
                  value={newStoreData.name}
                  onChange={(e) => setNewStoreData({ ...newStoreData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CTG-01"
                    value={newStoreData.code}
                    onChange={(e) => setNewStoreData({ ...newStoreData, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category Taxonomy *
                  </label>
                  <select
                    required
                    value={newStoreData.shopCategoryId}
                    onChange={(e) => setNewStoreData({ ...newStoreData, shopCategoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+8801..."
                    value={newStoreData.phone}
                    onChange={(e) => setNewStoreData({ ...newStoreData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="branch@business.com"
                    value={newStoreData.email}
                    onChange={(e) => setNewStoreData({ ...newStoreData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStoreOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Creating Outlet..." : "Create Outlet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
