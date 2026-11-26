"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";
import { MODAL_TRANSITION } from "@/lib/motion";
import { ROLE_LABELS, type UserRole } from "@/lib/types/auth";

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  course_id: string | null;
  courses?: { name: string; code: string } | null;
  is_active: boolean;
  created_at: string;
}

interface CourseItem {
  id: string;
  name: string;
  code: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("coordinator");
  const [courseId, setCourseId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const [res, meRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/auth/me"),
      ]);
      const data = await res.json();
      const meData = await meRes.json();
      if (meData.authenticated && meData.user?.id) {
        setCurrentUserId(meData.user.id);
      }
      if (data.success) {
        setUsers(data.users || []);
        setCourses(data.courses || []);
        if (data.courses?.length > 0 && !courseId) {
          setCourseId(data.courses[0].id);
        }
      }
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (role === "coordinator" && !courseId) {
      setFormError(
        "কোর্স কোঅর্ডিনেটরের জন্য অবশ্যই একটি নির্দিষ্ট কোর্স নির্বাচন করতে হবে (Course required for coordinator)"
      );
      return;
    }

    startSubmit(async () => {
      try {
        const payload = {
          full_name: fullName,
          email,
          phone,
          password,
          role,
          course_id: role === "coordinator" ? courseId : null,
        };

        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setFormError(data.error || "ইউজার তৈরি ব্যর্থ হয়েছে।");
          return;
        }

        setFormSuccess("ব্যবহারকারী সফলভাবে তৈরি করা হয়েছে!");
        // Reset form
        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("");
        await fetchUsers();

        setTimeout(() => {
          setShowAddModal(false);
          setFormSuccess(null);
        }, 1200);
      } catch {
        setFormError("সার্ভার ত্রুটি। আবার চেষ্টা করুন।");
      }
    });
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    setActionFeedback(null);
    if (userId === currentUserId && currentStatus) {
      setActionFeedback({
        type: "error",
        message: "নিজস্ব অ্যাকাউন্ট নিষ্ক্রিয় করা সম্ভব নয়। (Cannot deactivate own account)",
      });
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isActive: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
        );
        setActionFeedback({
          type: "success",
          message: data.message || "ব্যবহারকারীর স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে।",
        });
      } else {
        setActionFeedback({
          type: "error",
          message: data.error || "স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি।",
        });
      }
    } catch {
      setActionFeedback({
        type: "error",
        message: "সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি।",
      });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Flat Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4E4E7]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#09090B] tracking-tight">
          Users
        </h1>

        <button
          onClick={() => {
            setShowAddModal(true);
            setFormError(null);
            setFormSuccess(null);
          }}
          id="admin-add-user-btn"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D645D] text-white text-xs font-medium shrink-0 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Search & Role Filters */}
      <div className="bg-white border border-[#E4E4E7] rounded-lg p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] text-[#09090B] placeholder-[#71717A] text-xs focus:border-[#0F766E] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {["all", "admin", "coordinator", "staff", "intern"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap ${
                roleFilter === r
                  ? "bg-[#09090B] text-white"
                  : "bg-[#FAFAFA] border border-[#E4E4E7] text-[#52525B] hover:text-[#09090B]"
              }`}
            >
              {r === "all" ? "All Roles" : ROLE_LABELS[r as UserRole]?.en || r}
            </button>
          ))}
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          id="admin-action-feedback"
          className={`p-3 rounded-lg border flex items-start gap-2 text-xs ${
            actionFeedback.type === "error"
              ? "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"
              : "bg-white border-[#E4E4E7] text-[#09090B]"
          }`}
        >
          {actionFeedback.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Users List (Table on Desktop, Cards on Mobile) */}
      {loading ? (
        <div className="bg-white border border-[#E4E4E7] rounded-lg p-12 flex flex-col items-center justify-center gap-2 text-[#71717A] text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[#0F766E]" />
          <span>Loading directory...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-[#E4E4E7] rounded-lg p-8 text-center text-[#71717A] text-xs">
          No users match your filters.
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#FAFAFA] border-b border-[#E4E4E7] text-[#71717A] text-[12px] font-medium">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Name &amp; Email</th>
                    <th className="py-2.5 px-4 font-medium">Phone</th>
                    <th className="py-2.5 px-4 font-medium">Role</th>
                    <th className="py-2.5 px-4 font-medium">Course</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="h-12 hover:bg-[#F9FAFB]">
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-[#09090B] flex items-center gap-1.5">
                          <span>{u.full_name}</span>
                          {u.id === currentUserId && (
                            <span className="px-1.5 py-0.5 rounded bg-[#F4F4F5] border border-[#E4E4E7] text-[#52525B] text-[10px] font-medium">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11.5px] text-[#71717A]">{u.email}</div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-[#52525B] tabular-nums">
                        {u.phone}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F4F4F5] text-[#27272A] border border-[#E4E4E7]">
                          {ROLE_LABELS[u.role]?.en || u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        {u.role === "coordinator" ? (
                          u.courses?.name ? (
                            <span className="text-[#09090B]">
                              {u.courses.name} ({u.courses.code})
                            </span>
                          ) : (
                            <span className="text-[#DC2626] font-medium">Unassigned</span>
                          )
                        ) : (
                          <span className="text-[#71717A]">All departments</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#27272A]">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.is_active ? "bg-[#0F766E]" : "bg-[#A1A1AA]"
                            }`}
                          />
                          <span>{u.is_active ? "Active" : "Inactive"}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {u.id === currentUserId ? (
                          <span className="text-[11px] text-[#71717A]">Current user</span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(u.id, u.is_active)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border cursor-pointer ${
                              u.is_active
                                ? "bg-white text-[#52525B] border-[#E4E4E7] hover:bg-[#FEF2F2] hover:text-[#DC2626] hover:border-[#FECACA]"
                                : "bg-white text-[#0F766E] border-[#E4E4E7] hover:bg-[#F4F4F5]"
                            }`}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile 1-Column Cards View */}
          <div className="block md:hidden space-y-2.5">
            {filteredUsers.map((u) => (
              <div
                key={`mobile-${u.id}`}
                className="bg-white border border-[#E4E4E7] rounded-lg p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-medium text-[#09090B] text-[13px] flex items-center gap-1.5">
                      <span className="truncate">{u.full_name}</span>
                      {u.id === currentUserId && (
                        <span className="px-1.5 py-0.5 rounded bg-[#F4F4F5] border border-[#E4E4E7] text-[#52525B] text-[10px]">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#71717A] truncate">{u.email}</div>
                    <div className="text-xs font-mono text-[#52525B] tabular-nums">{u.phone}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F4F4F5] text-[#27272A] border border-[#E4E4E7] shrink-0">
                    {ROLE_LABELS[u.role]?.en || u.role}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#E4E4E7] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#52525B] truncate pr-2">
                    {u.role === "coordinator"
                      ? u.courses?.name
                        ? `${u.courses.name} (${u.courses.code})`
                        : "Unassigned"
                      : "All departments"}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#27272A]">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          u.is_active ? "bg-[#0F766E]" : "bg-[#A1A1AA]"
                        }`}
                      />
                      <span>{u.is_active ? "Active" : "Inactive"}</span>
                    </span>

                    {u.id !== currentUserId && (
                      <button
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium border ${
                          u.is_active
                            ? "bg-white text-[#DC2626] border-[#E4E4E7]"
                            : "bg-white text-[#0F766E] border-[#E4E4E7]"
                        }`}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add User Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#09090B]/40">
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={MODAL_TRANSITION}
            className="bg-white rounded-lg p-5 w-full max-w-lg border border-[#E4E4E7] shadow-[0_8px_24px_rgba(0,0,0,0.08)] space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#0F766E]" />
                <h3 className="font-semibold text-[#09090B] text-sm">
                  নতুন ব্যবহারকারী তৈরি করুন
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#71717A] hover:text-[#09090B] p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div
                id="create-user-error"
                className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  পুরো নাম <span className="text-slate-400">/ Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: ইঞ্জিনিয়ার মাহমুদুর রহমান"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    ইমেইল অ্যাড্রেস <span className="text-slate-400">/ Email</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@assdi.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    মোবাইল নম্বর <span className="text-slate-400">/ Phone</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="017XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  পাসওয়ার্ড (ন্যূনতম ৮ অক্ষর) <span className="text-slate-400">/ Password</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    ভূমিকা <span className="text-slate-400">/ Role</span>
                  </label>
                  <select
                    id="admin-role-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0F766E] focus:outline-none bg-white"
                  >
                    <option value="coordinator">Course Coordinator (কোর্স কোঅর্ডিনেটর)</option>
                    <option value="staff">Permanent Staff (স্থায়ী স্টাফ)</option>
                    <option value="intern">Intern / Trainee (ইন্টার্ন / ট্রেইনি)</option>
                    <option value="admin">Media Head / Admin (মিডিয়া প্রধান)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    বরাদ্দকৃত কোর্স{" "}
                    {role === "coordinator" ? (
                      <span className="text-red-500 font-bold">* আবশ্যক</span>
                    ) : (
                      <span className="text-slate-400">(প্রযোজ্য নয়)</span>
                    )}
                  </label>
                  <select
                    id="admin-course-select"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    disabled={role !== "coordinator"}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0F766E] focus:outline-none ${
                      role !== "coordinator"
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-white text-slate-900"
                    }`}
                  >
                    <option value="">কোর্স নির্বাচন করুন...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  id="submit-create-user-btn"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>তৈরি হচ্ছে...</span>
                    </>
                  ) : (
                    <span>ইউজার তৈরি নিশ্চিত করুন</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
