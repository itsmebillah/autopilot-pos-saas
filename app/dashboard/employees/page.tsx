"use client";

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
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
  Mail,
  Phone,
  Calendar,
  Eye,
  EyeOff,
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

  // Add Employee Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    fullName: "",
    email: "",
    role: "cashier",
    storeId: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // Edit Employee Modal State
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

  // Password Management Modal State
  const [passwordModalEmployee, setPasswordModalEmployee] = useState<EmployeeItem | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordModalTab, setPasswordModalTab] = useState<"set" | "generate" | "link">("set");
  const [tempPassword, setTempPassword] = useState("");
  const [confirmTempPassword, setConfirmTempPassword] = useState("");
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showConfirmTempPassword, setShowConfirmTempPassword] = useState(false);
  const [modalPasswordError, setModalPasswordError] = useState<string | null>(null);
  const [modalPasswordSuccess, setModalPasswordSuccess] = useState<string | null>(null);
  const [generatedTempPassword, setGeneratedTempPassword] = useState<string | null>(null);
  const [recoveryActionLink, setRecoveryActionLink] = useState<string | null>(null);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  // Compute available stores contextually
  const availableStores: StoreOption[] =
    stores.length > 0
      ? stores
      : user?.accessibleStores && user.accessibleStores.length > 0
        ? user.accessibleStores
        : user?.activeStore
          ? [user.activeStore]
          : [];

  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEmployees(data.employees || []);
          const fetchedStores = data.stores || [];
          setStores(fetchedStores);
        } else {
          setFormError(data.message || "Failed to load employees");
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        setFormError(errorData.message || `Server returned error status ${res.status}`);
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Handle Create Employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newEmployee.password) {
      setFormError("Initial password is required for employee account creation.");
      return;
    }

    if (newEmployee.password.length < 8) {
      setFormError("Initial password must be at least 8 characters long.");
      return;
    }

    if (newEmployee.password !== newEmployee.confirmPassword) {
      setFormError("Initial password and confirm password do not match.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      fullName: newEmployee.fullName,
      email: newEmployee.email,
      role: newEmployee.role,
      phone: newEmployee.phone,
      password: newEmployee.password,
      storeId: newEmployee.storeId || availableStores[0]?.id || user?.activeStore?.id || "",
    };

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        storeId: availableStores[0]?.id || "",
        phone: "",
        password: "",
        confirmPassword: "",
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
      await fetchEmployees();
    } catch (err: unknown) {
      const error = err as Error;
      setFormError(error.message || "Failed to create employee");
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

    const payload = {
      ...editFormData,
      storeId: editFormData.storeId || availableStores[0]?.id || user?.activeStore?.id || "",
    };

    try {
      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update employee");
      }

      setIsEditOpen(false);
      setEditingEmployee(null);
      await fetchEmployees();
    } catch (err: unknown) {
      const error = err as Error;
      setFormError(error.message || "Failed to update employee");
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

  // Handle Password Management Modal Open/Close & Actions
  const openPasswordModal = (employee: EmployeeItem) => {
    setPasswordModalEmployee(employee);
    setPasswordModalTab("set");
    setTempPassword("");
    setConfirmTempPassword("");
    setShowTempPassword(false);
    setShowConfirmTempPassword(false);
    setModalPasswordError(null);
    setModalPasswordSuccess(null);
    setGeneratedTempPassword(null);
    setRecoveryActionLink(null);
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordModalEmployee(null);
    setTempPassword("");
    setConfirmTempPassword("");
    setShowTempPassword(false);
    setShowConfirmTempPassword(false);
    setModalPasswordError(null);
    setModalPasswordSuccess(null);
    setGeneratedTempPassword(null);
    setRecoveryActionLink(null);
  };

  const handlePasswordActionSubmit = async (action: "set_password" | "generate" | "link") => {
    if (!passwordModalEmployee) return;

    setModalPasswordError(null);
    setModalPasswordSuccess(null);

    if (action === "set_password") {
      if (!tempPassword || tempPassword.length < 8) {
        setModalPasswordError("New temporary password must be at least 8 characters long.");
        return;
      }
      if (tempPassword !== confirmTempPassword) {
        setModalPasswordError("Password and confirmation do not match.");
        return;
      }
    }

    setIsModalSubmitting(true);

    try {
      const res = await fetch(`/api/employees/${passwordModalEmployee.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, password: tempPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to complete password management action.");
      }

      if (action === "set_password") {
        setModalPasswordSuccess(data.message || "Temporary password updated successfully.");
        setTempPassword("");
        setConfirmTempPassword("");
      } else if (action === "generate") {
        setModalPasswordSuccess(data.message || "Temporary password generated successfully.");
        setGeneratedTempPassword(data.temporaryPassword || null);
      } else if (action === "link") {
        setModalPasswordSuccess(data.message || "Password reset link generated successfully.");
        setRecoveryActionLink(data.recoveryLink || null);
        if (data.recoveryLink) {
          setRecoveryLink({ email: passwordModalEmployee.email, link: data.recoveryLink });
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setModalPasswordError(error.message || "Operation failed.");
    } finally {
      setIsModalSubmitting(false);
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
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex flex-col lg:flex-row transition-colors">
      <Sidebar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Compact POS Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                Employee Management
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 max-w-[160px] truncate">
                <Store size={11} className="shrink-0" />
                <span className="truncate">{user?.activeStore?.name || user?.organizationName || "Reyon Watch"}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-0.5">
              Staff team directory, RBAC roles & outlet permissions
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchEmployees()}
              title="Refresh Data"
              className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </button>

            {isOwner && (
              <button
                onClick={() => {
                  setFormError(null);
                  const initialStoreId = availableStores[0]?.id || user?.activeStore?.id || "";
                  setNewEmployee({
                    fullName: "",
                    email: "",
                    role: "cashier",
                    storeId: initialStoreId,
                    phone: "",
                    password: "",
                    confirmPassword: "",
                  });
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                  setIsAddOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-green-600/20 transition-all active:scale-95 cursor-pointer"
              >
                <UserPlus size={16} />
                <span>Add Employee</span>
              </button>
            )}
          </div>
        </div>

        {/* Password Recovery Feedback Banner */}
        {recoveryLink && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <KeyRound size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Password Link Generated for {recoveryLink.email}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
                  Action Link: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">{recoveryLink.link}</code>
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(recoveryLink.link);
                alert("Recovery link copied to clipboard!");
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 self-start sm:self-auto cursor-pointer"
            >
              Copy Link
            </button>
          </div>
        )}

        {/* 6 Summary Metric Cards (Compact 2-col on mobile, 6-col on desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Staff</span>
              <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{totalEmployees}</p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Active</span>
              <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-green-600 dark:text-green-400">{activeEmployees}</p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Inactive</span>
              <XCircle size={14} className="text-red-500 dark:text-red-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-red-500 dark:text-red-400">{inactiveEmployees}</p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Sales Staff</span>
              <Briefcase size={14} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{salesStaff}</p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Managers</span>
              <Shield size={14} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{managers}</p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Other Roles</span>
              <Users size={14} className="text-amber-500 dark:text-amber-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{otherRoles}</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 shadow-sm">
          <div className="relative w-full sm:w-72 md:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="owner">Shop Owner</option>
                <option value="manager">Store Manager</option>
                <option value="cashier">Sales Person / Cashier</option>
                <option value="inventory">Inventory Staff</option>
                <option value="accountant">Accountant</option>
              </select>
            </div>

            <div className="flex-1 sm:flex-initial">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Directory Section Header */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={16} className="text-green-600 dark:text-green-400" />
            <span>Store Staff Directory ({filteredEmployees.length})</span>
          </h2>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-green-500" />
            <p className="text-xs">Loading employees...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Users size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Staff Members Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No staff members match the selected filters. Click &quot;Add Employee&quot; to onboard staff.
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE VIEW: Touch-Friendly Responsive Cards (sm:hidden) */}
            <div className="sm:hidden space-y-2.5">
              {filteredEmployees.map((emp) => {
                const roleConfig = ROLE_DESCRIPTIONS[emp.role.toLowerCase()] || ROLE_DESCRIPTIONS.cashier;
                const isSelf = emp.userId === user?.id;

                return (
                  <div
                    key={emp.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    {/* Card Header: Avatar, Name, Role & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-green-500/10 text-green-700 dark:text-green-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {emp.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5 truncate">
                            <span className="truncate">{emp.fullName}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border mt-0.5 ${roleConfig.badgeClass}`}
                          >
                            <Shield size={10} />
                            {roleConfig.label}
                          </span>
                        </div>
                      </div>

                      {/* Active Status Badge */}
                      {emp.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Card Details: Email, Phone, Outlet */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                      {emp.phone && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{emp.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 truncate text-slate-800 dark:text-slate-200 font-medium">
                        <Store size={12} className="text-green-600 dark:text-green-400 shrink-0" />
                        <span className="truncate">{emp.primaryStore?.name || "Main Outlet"}</span>
                      </div>
                    </div>

                    {/* Touch Action Bar (Owner/Manager) */}
                    {isOwner && (
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => {
                            setEditingEmployee(emp);
                            setEditFormData({
                              fullName: emp.fullName,
                              phone: emp.phone || "",
                              role: emp.role,
                              storeId: emp.primaryStore?.id || availableStores[0]?.id || "",
                              isActive: emp.isActive,
                            });
                            setIsEditOpen(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => openPasswordModal(emp)}
                          title="Manage Password"
                          aria-label="Manage Password"
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shrink-0 cursor-pointer"
                        >
                          <KeyRound size={15} />
                        </button>

                        {!isSelf && (
                          <button
                            onClick={() => handleToggleStatus(emp)}
                            className={`flex items-center justify-center gap-1 py-1.5 px-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${emp.isActive
                                ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100"
                                : "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 hover:bg-green-100"
                              }`}
                          >
                            {emp.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                            <span>{emp.isActive ? "Deactivate" : "Activate"}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* DESKTOP VIEW: Full Data Table (hidden sm:block) */}
            <div className="hidden sm:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
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
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-slate-400" />
                              <span>{new Date(emp.createdAt).toLocaleDateString()}</span>
                            </div>
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
                                      storeId: emp.primaryStore?.id || availableStores[0]?.id || "",
                                      isActive: emp.isActive,
                                    });
                                    setIsEditOpen(true);
                                  }}
                                  title="Edit Employee"
                                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                  <Edit2 size={15} />
                                </button>

                                <button
                                  onClick={() => openPasswordModal(emp)}
                                  title="Manage Password"
                                  aria-label="Manage Password"
                                  className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                                >
                                  <KeyRound size={15} />
                                </button>

                                {!isSelf && (
                                  <button
                                    onClick={() => handleToggleStatus(emp)}
                                    title={emp.isActive ? "Deactivate" : "Activate"}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${emp.isActive
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
            </div>
          </>
        )}

        {/* ADD EMPLOYEE MODAL */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col my-auto">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-green-600 dark:text-green-400" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Add Store Employee
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="mx-5 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold shrink-0">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateEmployee} className="p-5 space-y-4 overflow-y-auto">
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
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="john@store.com"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+880 1700-000000"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Initial Authentication Password Fields */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Initial Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        placeholder="Min 8 characters"
                        value={newEmployee.password}
                        onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                        className="w-full pl-3.5 pr-9 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={8}
                        placeholder="Re-enter password"
                        value={newEmployee.confirmPassword}
                        onChange={(e) => setNewEmployee({ ...newEmployee, confirmPassword: e.target.value })}
                        className="w-full pl-3.5 pr-9 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role & Permissions *
                  </label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="cashier">Sales Person / Cashier (POS, Sales, Invoices)</option>
                    <option value="manager">Store Manager (POS, Inventory, Products, Reports)</option>
                    <option value="inventory">Inventory Staff (Stock, Products, Movements)</option>
                    <option value="accountant">Accountant (Financial Reports, Balances)</option>
                    <option value="owner">Shop Owner (Full Admin Privileges)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {ROLE_DESCRIPTIONS[newEmployee.role]?.desc}
                  </p>
                </div>

                {/* Store / Outlet Selection Section */}
                {availableStores.length <= 1 ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Store Outlet
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <Store size={14} className="text-green-600 dark:text-green-400 shrink-0" />
                      <span className="truncate">{availableStores[0]?.name || user?.activeStore?.name || "Reyon Watch - Main Branch"}</span>
                      <span className="ml-auto text-[10px] text-slate-500 font-normal shrink-0">(Automatically assigned)</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Store Outlet *
                    </label>
                    <select
                      value={newEmployee.storeId || availableStores[0]?.id}
                      onChange={(e) => setNewEmployee({ ...newEmployee, storeId: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {availableStores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `(${s.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold bg-green-600 hover:bg-green-500 text-white rounded-xl shadow-lg shadow-green-600/20 transition-all cursor-pointer"
                  >
                    {isSubmitting ? "Creating..." : "Create Employee"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT EMPLOYEE MODAL */}
        {isEditOpen && editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col my-auto">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
                <div className="flex items-center gap-2">
                  <Edit2 size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                    Edit Employee: {editingEmployee.fullName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="mx-5 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold shrink-0">
                  {formError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="p-5 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.fullName}
                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role & Permissions *
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="cashier">Sales Person / Cashier (POS, Sales, Invoices)</option>
                    <option value="manager">Store Manager (POS, Inventory, Products, Reports)</option>
                    <option value="inventory">Inventory Staff (Stock, Products, Movements)</option>
                    <option value="accountant">Accountant (Financial Reports, Balances)</option>
                    <option value="owner">Shop Owner (Full Admin Privileges)</option>
                  </select>
                </div>

                {availableStores.length <= 1 ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Store Outlet
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <Store size={14} className="text-green-600 dark:text-green-400 shrink-0" />
                      <span className="truncate">{availableStores[0]?.name || user?.activeStore?.name || "Reyon Watch - Main Branch"}</span>
                      <span className="ml-auto text-[10px] text-slate-500 font-normal shrink-0">(Automatically assigned)</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Store Outlet *
                    </label>
                    <select
                      value={editFormData.storeId || availableStores[0]?.id}
                      onChange={(e) => setEditFormData({ ...editFormData, storeId: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {availableStores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `(${s.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label htmlFor="editIsActive" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Employee Account Active
                  </label>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PASSWORD MANAGEMENT MODAL */}
        {isPasswordModalOpen && passwordModalEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md sm:max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col my-auto">
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <KeyRound size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                      Password Management
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {passwordModalEmployee.fullName} ({passwordModalEmployee.email})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Security Policy Notice */}
              <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5 shrink-0">
                <Shield size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Security & Privacy Policy</p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    For security, existing passwords cannot be viewed. You can set a new temporary password or send a password reset link.
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Feedback Alerts */}
                {modalPasswordError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
                    {modalPasswordError}
                  </div>
                )}

                {modalPasswordSuccess && (
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0 text-green-600 dark:text-green-400" />
                    <span>{modalPasswordSuccess}</span>
                  </div>
                )}

                {/* Option Selector Tabs */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordModalTab("set");
                      setModalPasswordError(null);
                      setModalPasswordSuccess(null);
                    }}
                    className={`flex-1 py-2 px-2.5 rounded-lg transition-all cursor-pointer truncate ${
                      passwordModalTab === "set"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Set Temporary
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordModalTab("generate");
                      setModalPasswordError(null);
                      setModalPasswordSuccess(null);
                    }}
                    className={`flex-1 py-2 px-2.5 rounded-lg transition-all cursor-pointer truncate ${
                      passwordModalTab === "generate"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordModalTab("link");
                      setModalPasswordError(null);
                      setModalPasswordSuccess(null);
                    }}
                    className={`flex-1 py-2 px-2.5 rounded-lg transition-all cursor-pointer truncate ${
                      passwordModalTab === "link"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Reset Link
                  </button>
                </div>

                {/* Tab 1: Set Temporary Password */}
                {passwordModalTab === "set" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handlePasswordActionSubmit("set_password");
                    }}
                    className="space-y-3.5"
                  >
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        New Temporary Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showTempPassword ? "text" : "password"}
                          required
                          minLength={8}
                          placeholder="Minimum 8 characters"
                          value={tempPassword}
                          onChange={(e) => setTempPassword(e.target.value)}
                          className="w-full pl-3.5 pr-9 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTempPassword(!showTempPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                          aria-label={showTempPassword ? "Hide password" : "Show password"}
                        >
                          {showTempPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Confirm Temporary Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmTempPassword ? "text" : "password"}
                          required
                          minLength={8}
                          placeholder="Re-enter password"
                          value={confirmTempPassword}
                          onChange={(e) => setConfirmTempPassword(e.target.value)}
                          className="w-full pl-3.5 pr-9 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmTempPassword(!showConfirmTempPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                          aria-label={showConfirmTempPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmTempPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isModalSubmitting}
                      className="w-full py-2.5 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isModalSubmitting ? "Updating..." : "Set Temporary Password"}
                    </button>
                  </form>
                )}

                {/* Tab 2: Generate Password */}
                {passwordModalTab === "generate" && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Generate a secure random temporary password on the server for{" "}
                      <strong className="text-slate-900 dark:text-white">{passwordModalEmployee.fullName}</strong>.
                    </p>

                    {generatedTempPassword ? (
                      <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
                        <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                          Generated Temporary Password (Shown Once)
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={generatedTempPassword}
                            className="flex-1 px-3 py-2 text-sm font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-indigo-200 dark:border-indigo-800"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedTempPassword);
                              alert("Temporary password copied to clipboard!");
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 cursor-pointer"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Please communicate this temporary password securely to the employee. It will not be stored or shown again.
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePasswordActionSubmit("generate")}
                        disabled={isModalSubmitting}
                        className="w-full py-2.5 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isModalSubmitting ? "Generating..." : "Generate Temporary Password"}
                      </button>
                    )}
                  </div>
                )}

                {/* Tab 3: Password Reset Link */}
                {passwordModalTab === "link" && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Send a secure password recovery link to{" "}
                      <strong className="text-slate-900 dark:text-white">{passwordModalEmployee.email}</strong>.
                    </p>

                    {recoveryActionLink ? (
                      <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
                        <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                          Password Reset Link
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={recoveryActionLink}
                            className="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-indigo-200 dark:border-indigo-800 truncate"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(recoveryActionLink);
                              alert("Recovery link copied to clipboard!");
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 cursor-pointer"
                          >
                            Copy Link
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePasswordActionSubmit("link")}
                        disabled={isModalSubmitting}
                        className="w-full py-2.5 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isModalSubmitting ? "Generating Link..." : "Send Password Reset Link"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
