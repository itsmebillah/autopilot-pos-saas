"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  Store,
  Users,
  Package,
  ShoppingCart,
  ArrowLeft,
  Plus,
  Layers,
  Tag,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
  subscription_status: string;
  created_at: string;
  stats: {
    totalStores: number;
    totalUsers: number;
    totalProducts: number;
    totalSales: number;
  };
  stores: Array<{
    id: string;
    name: string;
    code: string;
    phone?: string;
    email?: string;
    address?: string;
    currency: string;
    currency_symbol: string;
    timezone: string;
    is_active: boolean;
    created_at: string;
    enabled_modules?: string[];
    shop_categories?: {
      id: string;
      key: string;
      name: string;
      description?: string;
      default_attributes?: Array<{
        name: string;
        label: string;
        data_type: string;
      }>;
      default_modules?: string[];
    };
  }>;
  organization_members: Array<{
    id: string;
    user_id: string;
    role: string;
    is_active: boolean;
    created_at: string;
    user_profiles?: {
      id: string;
      full_name: string;
      phone?: string;
      avatar_url?: string;
    };
  }>;
}

export default function ShopDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [org, setOrg] = useState<OrganizationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Add Outlet Modal
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [newStoreData, setNewStoreData] = useState({
    name: "",
    code: "",
    shopCategoryId: "",
    phone: "",
    email: "",
    address: "",
  });

  const fetchOrgDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [orgRes, catRes] = await Promise.all([
        fetch(`/api/admin/organizations/${id}`),
        fetch("/api/admin/categories"),
      ]);

      if (!orgRes.ok) {
        throw new Error("Failed to load organization details");
      }

      const orgData = await orgRes.json();
      if (orgData.success) {
        setOrg(orgData.organization);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.success) {
          setCategories(catData.categories);
          if (catData.categories.length > 0 && !newStoreData.shopCategoryId) {
            setNewStoreData((prev) => ({ ...prev, shopCategoryId: catData.categories[0].id }));
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch organization details");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrgDetails();
  }, [fetchOrgDetails]);

  // Handle Org Status Toggle (Activate / Suspend)
  const handleToggleOrgStatus = async () => {
    if (!org) return;
    try {
      setIsUpdating(true);
      const newStatus = org.subscription_status === "active" ? "suspended" : "active";
      const res = await fetch(`/api/admin/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionStatus: newStatus }),
      });

      if (res.ok) {
        await fetchOrgDetails();
      }
    } catch (err) {
      console.error("Failed to update organization status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Store Status Toggle
  const handleToggleStoreStatus = async (storeId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        await fetchOrgDetails();
      }
    } catch (err) {
      console.error("Failed to update store status:", err);
    }
  };

  // Handle Add Store
  const handleAddStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;

    try {
      setIsUpdating(true);
      const res = await fetch("/api/admin/stores/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: org.id,
          ...newStoreData,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create store outlet");
      }

      setIsAddStoreOpen(false);
      setNewStoreData({
        name: "",
        code: "",
        shopCategoryId: categories[0]?.id || "",
        phone: "",
        email: "",
        address: "",
      });
      await fetchOrgDetails();
    } catch (err: any) {
      alert(err.message || "Error creating outlet");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-slate-400">
        <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-indigo-500" />
        <p className="text-sm font-semibold">Loading organization details...</p>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl my-12">
        <AlertTriangle size={36} className="text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Failed to Load Business</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
          {error || "The requested organization could not be found."}
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
        >
          <ArrowLeft size={14} />
          <span>Back to Console</span>
        </Link>
      </div>
    );
  }

  const isOrgActive = org.subscription_status === "active";
  const primaryStore = org.stores[0] || null;

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {org.name}
              </h1>
              {isOrgActive ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                  Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  Suspended
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Slug: <code className="font-mono text-[11px]">{org.slug}</code> • Plan: <span className="uppercase font-bold">{org.plan_tier}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>Add Outlet</span>
          </button>

          <button
            onClick={handleToggleOrgStatus}
            disabled={isUpdating}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isOrgActive
                ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-100"
                : "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 hover:bg-green-100"
            }`}
          >
            {isUpdating ? "Updating..." : isOrgActive ? "Suspend Business" : "Activate Business"}
          </button>
        </div>
      </div>

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Outlets</span>
            <Store size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {org.stats.totalStores}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Branches</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Staff Users</span>
            <Users size={18} className="text-violet-600 dark:text-violet-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {org.stats.totalUsers}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Assigned Members</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Catalog Products</span>
            <Package size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {org.stats.totalProducts}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Active SKUs</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Sales</span>
            <ShoppingCart size={18} className="text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {org.stats.totalSales}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Orders Processed</span>
        </div>
      </div>

      {/* Stores & Outlets List */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Store size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span>Store Outlets ({org.stores.length})</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Multi-branch isolated inventory & POS contexts
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {org.stores.map((store) => (
            <div
              key={store.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {store.name}
                  </h3>
                  <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">
                    {store.code}
                  </code>
                  {store.is_active ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      Suspended
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Tag size={12} className="text-indigo-500" />
                    <span>{store.shop_categories?.name || "General Retail"}</span>
                  </span>
                  <span>•</span>
                  <span>Currency: <strong>{store.currency_symbol} {store.currency}</strong></span>
                  <span>•</span>
                  <span>Timezone: {store.timezone}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => handleToggleStoreStatus(store.id, store.is_active)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    store.is_active
                      ? "text-red-600 dark:text-red-400 hover:bg-red-500/10"
                      : "text-green-600 dark:text-green-400 hover:bg-green-500/10"
                  }`}
                >
                  {store.is_active ? "Suspend Outlet" : "Activate Outlet"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff & Admin Users List */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-violet-600 dark:text-violet-400" />
            <span>Assigned Users & Permissions ({org.organization_members.length})</span>
          </h2>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {org.organization_members.map((member) => (
            <div key={member.id} className="p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs">
                  {member.user_profiles?.full_name?.charAt(0) || "U"}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                    {member.user_profiles?.full_name || "Authorized User"}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {member.user_profiles?.phone || "No phone listed"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Configuration & Schema Inspector */}
      {primaryStore?.shop_categories && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers size={18} className="text-indigo-600 dark:text-indigo-400" />
              <span>Category Schema: {primaryStore.shop_categories.name}</span>
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              {primaryStore.shop_categories.key}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {primaryStore.shop_categories.description}
          </p>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Active Custom Attributes
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(primaryStore.shop_categories.default_attributes || []).map((attr, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">{attr.label}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">({attr.data_type})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD OUTLET MODAL */}
      {isAddStoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Add Store Outlet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  New branch for {org.name}
                </p>
              </div>

              <button
                onClick={() => setIsAddStoreOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStoreSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Outlet / Store Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Banani Branch"
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
                    placeholder="e.g. BNN-01"
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
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isUpdating ? "Creating Outlet..." : "Create Outlet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
