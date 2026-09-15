"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Store,
  Search,
  CheckCircle2,
  XCircle,
  KeyRound,
  Edit2,
  RefreshCw,
  Briefcase,
  UserCheck,
  UserX,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface EmployeeItem {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  assignedStores: Array<{ id: string; name: string; code?: string }>;
  primaryStore: { id: string; name: string; code?: string };
}

interface StoreOption {
  id: string;
  name: string;
  code?: string;
}

const ROLE_DESCRIPTIONS: Record<string, { label: string; desc: string; badgeClass: string }> = {
  owner: {
    label: "Shop Owner",
    desc: "Full business administration, employee management, store settings, reports, POS, and inventory.",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  manager: {
    label: "Store Manager",
    desc: "Manage POS operations, inventory, products, staff shifts, and operational reports.",
    badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  },
  cashier: {
    label: "Sales Person / Cashier",
    desc: "POS barcode scanning, sales checkout, payment collection, customer dues, and invoice printing.",
    badgeClass: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  },
  inventory: {
    label: "Inventory Staff",
    desc: "Stock intake, inventory ledger adjustments, product adding, and stock movement logs.",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  accountant: {
    label: "Accountant / Finance",
    desc: "Sales financial margins, expenses, customer/supplier balances, and profit reports.",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  },
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Add Employee Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    fullName: "",
    email: "",
    role: "cashier",
    storeId: "",
    phone: "",
  });

  // Edit Employee Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    phone: "",
    role: "cashier",
    storeId: "",
    isActive: true,
  });

  // Password Reset Feedback
  const [recoveryLink, setRecoveryLink] = useState<{ email: string; link: string } | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEmployees(data.employees || []);
          setStores(data.stores || []);
          if (data.stores?.length > 0 && !newEmployee.storeId) {
            setNewEmployee((prev) => ({ ...prev, storeId: data.stores[0].id }));
          }
        }
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setIsLoading(false);
    }
  }, [newEmployee.storeId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Handle Create Employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployee),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create employee");
      }

      setIsAddOpen(false);
      setNewEmployee({
        fullName: "",
        email: "",
        role: "cashier",
        storeId: stores[0]?.id || "",
        phone: "",
      });
      await fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || "Failed to create employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Employee Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update employee");
      }

      setIsEditOpen(false);
      setEditingEmployee(null);
      await fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || "Failed to update employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Active Status
  const handleToggleStatus = async (employee: EmployeeItem) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !employee.isActive }),
      });
      if (res.ok) {
        await fetchEmployees();
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  // Handle Trigger Password Reset
  const handleResetPassword = async (employee: EmployeeItem) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.recoveryLink) {
        setRecoveryLink({ email: employee.email, link: data.recoveryLink });
      } else {
        alert(data.message || "Password recovery initiated");
      }
    } catch (err) {
      console.error("Password reset error:", err);
    }
  };

  // Filtered employees list
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.phone && emp.phone.includes(searchQuery));

    const matchesRole = roleFilter === "all" || emp.role.toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && emp.isActive) ||
      (statusFilter === "inactive" && !emp.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate Metrics
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.isActive).length;
  const inactiveEmployees = employees.filter((e) => !e.isActive).length;
  const salesStaff = employees.filter((e) => e.role === "cashier" || e.role === "staff").length;
  const managers = employees.filter((e) => e.role === "manager").length;
  const otherRoles = employees.filter((e) => e.role === "inventory" || e.role === "accountant").length;

  const isOwner = user?.role === "owner" || user?.isSuperAdmin;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Employee & Staff Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
              {user?.organizationName || "Store Staff"}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage store team members, RBAC role permissions, and outlet assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchEmployees()}
            title="Refresh Data"
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <RefreshCw size={17} className={isLoading ? "animate-spin" : ""} />
          </button>

          {isOwner && (
            <button
              onClick={() => {
                setFormError(null);
                setIsAddOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-bold shadow-lg shadow-green-600/20 transition-all transform active:scale-95"
            >
              <UserPlus size={18} />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Password Recovery Feedback Banner */}
      {recoveryLink && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <KeyRound size={20} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Password Setup Link Generated for {recoveryLink.email}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-lg">
                Action Link: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">{recoveryLink.link}</code>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(recoveryLink.link);
              alert("Recovery link copied to clipboard!");
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
          >
            Copy Link
          </button>
        </div>
      )}

      {/* 6 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Staff</span>
            <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{totalEmployees}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Active</span>
            <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-black text-green-600 dark:text-green-400">{activeEmployees}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Inactive</span>
            <XCircle size={16} className="text-red-500 dark:text-red-400" />
          </div>
          <p className="text-2xl font-black text-red-500 dark:text-red-400">{inactiveEmployees}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Sales Staff</span>
            <Briefcase size={16} className="text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{salesStaff}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Managers</span>
            <Shield size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{managers}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Other Roles</span>
            <Users size={16} className="text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{otherRoles}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Roles</option>
              <option value="owner">Shop Owner</option>
              <option value="manager">Store Manager</option>
              <option value="cashier">Sales Person / Cashier</option>
              <option value="inventory">Inventory Staff</option>
              <option value="accountant">Accountant</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table / Card List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-green-600 dark:text-green-400" />
            <span>Store Staff Directory ({filteredEmployees.length})</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-green-500" />
            <p className="text-xs">Loading employees...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Employees Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No staff members match the selected filters. Click &quot;Add Employee&quot; to onboard staff.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-6">Role & Permissions</th>
                  <th className="py-3.5 px-6">Assigned Outlet</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Joined Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredEmployees.map((emp) => {
                  const roleConfig = ROLE_DESCRIPTIONS[emp.role.toLowerCase()] || ROLE_DESCRIPTIONS.cashier;
                  const isSelf = emp.userId === user?.id;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {emp.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                              <span>{emp.fullName}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-2">
                              <span>{emp.email}</span>
                              {emp.phone && <span>• {emp.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${roleConfig.badgeClass}`}
                        >
                          <Shield size={12} />
                          {roleConfig.label}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Store size={13} className="text-green-600 dark:text-green-400" />
                          <span>{emp.primaryStore?.name || "Main Outlet"}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {emp.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-medium">
                        {new Date(emp.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-6 text-right">
                        {isOwner && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingEmployee(emp);
                                setEditFormData({
                                  fullName: emp.fullName,
                                  phone: emp.phone || "",
                                  role: emp.role,
                                  storeId: emp.primaryStore?.id || stores[0]?.id || "",
                                  isActive: emp.isActive,
                                });
                                setIsEditOpen(true);
                              }}
                              title="Edit Employee"
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 size={15} />
                            </button>

                            <button
                              onClick={() => handleResetPassword(emp)}
                              title="Generate Password Setup Link"
                              className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            >
                              <KeyRound size={15} />
                            </button>

                            {!isSelf && (
                              <button
                                onClick={() => handleToggleStatus(emp)}
                                title={emp.isActive ? "Deactivate" : "Activate"}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  emp.isActive
                                    ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                                    : "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40"
                                }`}
                              >
                                {emp.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-green-600 dark:text-green-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Add Store Employee
                </h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
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

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newEmployee.fullName}
                  onChange={(e) => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="employee@shop.com"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+8801..."
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Role *
                  </label>
                  <select
                    required
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                  >
                    <option value="cashier">Sales Person / Cashier</option>
                    <option value="manager">Store Manager</option>
                    <option value="inventory">Inventory Staff</option>
                    <option value="accountant">Accountant / Finance</option>
                    {isOwner && <option value="owner">Shop Owner</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Store Outlet *
                  </label>
                  <select
                    required
                    value={newEmployee.storeId}
                    onChange={(e) => setNewEmployee({ ...newEmployee, storeId: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Role Capability Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Permissions: {ROLE_DESCRIPTIONS[newEmployee.role]?.label}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {ROLE_DESCRIPTIONS[newEmployee.role]?.desc}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Onboarding Staff..." : "Onboard Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {isEditOpen && editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Edit Employee: {editingEmployee.fullName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{editingEmployee.email}</p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                  >
                    <option value="cashier">Sales Person / Cashier</option>
                    <option value="manager">Store Manager</option>
                    <option value="inventory">Inventory Staff</option>
                    <option value="accountant">Accountant / Finance</option>
                    {isOwner && <option value="owner">Shop Owner</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store Outlet
                  </label>
                  <select
                    value={editFormData.storeId}
                    onChange={(e) => setEditFormData({ ...editFormData, storeId: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editFormData.isActive}
                  onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Account Active (Uncheck to suspend access)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
