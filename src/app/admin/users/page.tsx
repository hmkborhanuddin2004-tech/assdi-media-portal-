"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import {
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Filter,
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
      {/* Top Header */}
      <div className="glass-panel p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0f766e]/15 text-[#0b5a54] text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>অ্যাডমিন আরবাক কন্ট্রোল • RBAC Security</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-[#0b1f3a] tracking-tight">
            ব্যবহারকারী ও ভূমিকা ব্যবস্থাপনা
          </h1>
          <p className="text-xs sm:text-[13px] text-[#33475f] font-medium">
            পোর্টালের সকল মিডিয়া হেড, কোঅর্ডিনেটর, স্টাফ ও ইন্টার্নদের অ্যাকাউন্ট ও
            অনুমতি নিয়ন্ত্রণ করুন।
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddModal(true);
            setFormError(null);
            setFormSuccess(null);
          }}
          id="admin-add-user-btn"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0b5a54] text-white text-xs sm:text-sm font-semibold shadow-[0_6px_14px_rgba(15,118,110,0.3)] transition-all duration-150 shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>নতুন ব্যবহারকারী যোগ করুন</span>
        </button>
      </div>

      {/* Security Banner: Self-Signup Disabled */}
      <div className="p-3.5 rounded-[14px] bg-amber-500/15 backdrop-blur-md border border-amber-400/35 text-[#0b1f3a] text-xs flex items-start gap-2.5 leading-relaxed font-medium">
        <ShieldAlert className="w-4 h-4 text-[#b45309] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#b45309]">জিরো পাবলিক সেলফ-সাইনআপ নীতি:</span> সাধারণ
          জনগণের রেজিস্ট্রেশন সম্পূর্ণ বন্ধ রাখা হয়েছে। কেবলমাত্র এই অ্যাডমিন প্যানেল
          হতে তৈরি করা ক্রেডেনশিয়াল দিয়েই পোর্টালে লগইন করা সম্ভব।
        </div>
      </div>

      {/* Search & Role Filters */}
      <div className="glass-panel p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#33475f] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="নাম, ইমেইল বা ফোন নম্বর দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[11px] border border-white/80 bg-white/55 text-[#0b1f3a] placeholder-[#475569] text-xs focus:ring-2 focus:ring-[#0F766E]/25 focus:bg-white/75 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <Filter className="w-3.5 h-3.5 text-[#33475f] shrink-0" />
          {["all", "admin", "coordinator", "staff", "intern"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                roleFilter === r
                  ? "bg-[#0F766E] text-white shadow-[0_5px_12px_rgba(15,118,110,0.3)]"
                  : "bg-white/55 border border-white/80 text-[#33475f] hover:bg-white/80 hover:text-[#0b1f3a]"
              }`}
            >
              {r === "all" ? "সকল রোল" : ROLE_LABELS[r as UserRole]?.en || r}
            </button>
          ))}
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          id="admin-action-feedback"
          className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
            actionFeedback.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {actionFeedback.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Users List (Table on Desktop, Cards on Mobile) */}
      {loading ? (
        <div className="glass-panel p-12 flex flex-col items-center justify-center gap-3 text-[#33475f] text-xs font-medium">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" />
          <span>ইউজার তালিকা লোড হচ্ছে...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="glass-panel p-8 text-center text-[#33475f] text-xs font-medium">
          কোনো ব্যবহারকারী পাওয়া যায়নি।
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead className="bg-white/30 border-b border-white/70 text-[#33475f] text-[10px] font-bold uppercase tracking-[0.13em]">
                  <tr>
                    <th className="py-3 px-4">নাম ও ইমেইল</th>
                    <th className="py-3 px-4">মোবাইল নম্বর</th>
                    <th className="py-3 px-4">ভূমিকা (Role)</th>
                    <th className="py-3 px-4">বরাদ্দকৃত কোর্স</th>
                    <th className="py-3 px-4">স্ট্যাটাস</th>
                    <th className="py-3 px-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/45">
                  {filteredUsers.map((u) => {
                    const roleStyle = {
                      admin: "bg-[#0f766e]/15 text-[#0b5a54] border-[#0f766e]/30",
                      coordinator: "bg-teal-500/12 text-[#0f766e] border-teal-500/25",
                      staff: "bg-slate-700/10 text-[#0b1f3a] border-slate-500/25",
                      intern: "bg-slate-500/10 text-[#33475f] border-slate-400/30",
                    }[u.role];

                    return (
                      <tr key={u.id} className="hover:bg-white/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#0b1f3a] flex items-center gap-1.5">
                            <span>{u.full_name}</span>
                            {u.id === currentUserId && (
                              <span className="px-1.5 py-0.5 rounded bg-[#0f766e]/15 text-[#0b5a54] text-[10px] font-bold">
                                আপনি
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#33475f] font-medium">{u.email}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#0b1f3a] font-medium">{u.phone}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${roleStyle}`}
                          >
                            {ROLE_LABELS[u.role]?.bn} ({u.role})
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.role === "coordinator" ? (
                            u.courses?.name ? (
                              <span className="font-semibold text-[#0b1f3a]">
                                {u.courses.name} ({u.courses.code})
                              </span>
                            ) : (
                              <span className="text-[#dc2626] text-[11px] font-semibold">
                                কোর্স বরাদ্দ নেই
                              </span>
                            )
                          ) : (
                            <span className="text-[#33475f] font-medium">সকল ডিপার্টমেন্ট</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                              u.is_active
                                ? "bg-[#22c55e]/15 text-[#15803d]"
                                : "bg-slate-500/15 text-[#33475f]"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.is_active ? "bg-[#15803d]" : "bg-[#33475f]"
                              }`}
                            />
                            <span>{u.is_active ? "সক্রিয় (Active)" : "নিষ্ক্রিয় (Inactive)"}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {u.id === currentUserId ? (
                            <span className="text-[11px] text-[#33475f] italic font-medium px-2 py-1">
                              বর্তমান ইউজার
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(u.id, u.is_active)}
                              className={`px-2.5 py-1 rounded-[9px] text-[11px] font-semibold border transition-all cursor-pointer ${
                                u.is_active
                                  ? "bg-white/55 text-[#33475f] border-white/85 hover:bg-red-500/10 hover:text-[#dc2626]"
                                  : "bg-[#0f766e]/15 text-[#0b5a54] border-[#0f766e]/30 hover:bg-[#0f766e]/25"
                              }`}
                            >
                              {u.is_active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile 1-Column Cards View */}
          <div className="block md:hidden space-y-3">
            {filteredUsers.map((u) => {
              const roleStyle = {
                admin: "bg-[#0f766e]/15 text-[#0b5a54] border-[#0f766e]/30",
                coordinator: "bg-teal-500/12 text-[#0f766e] border-teal-500/25",
                staff: "bg-slate-700/10 text-[#0b1f3a] border-slate-500/25",
                intern: "bg-slate-500/10 text-[#33475f] border-slate-400/30",
              }[u.role];

              return (
                <div
                  key={`mobile-${u.id}`}
                  className="glass-panel p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#0b1f3a] text-sm flex items-center gap-1.5">
                        <span>{u.full_name}</span>
                        {u.id === currentUserId && (
                          <span className="px-1.5 py-0.5 rounded bg-[#0f766e]/15 text-[#0b5a54] text-[10px] font-bold">
                            আপনি
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#33475f] font-medium">{u.email}</div>
                      <div className="text-xs font-mono text-[#0b1f3a]">{u.phone}</div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleStyle} shrink-0`}
                    >
                      {ROLE_LABELS[u.role]?.bn}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/55 flex items-center justify-between text-xs">
                    <div>
                      {u.role === "coordinator" ? (
                        <span className="text-[11px] font-semibold text-[#0b1f3a]">
                          {u.courses?.name ? `${u.courses.name} (${u.courses.code})` : "কোর্স নেই"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#33475f] font-medium">সকল ডিপার্টমেন্ট</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.is_active ? "bg-[#22c55e]/15 text-[#15803d]" : "bg-slate-500/15 text-[#33475f]"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.is_active ? "bg-[#15803d]" : "bg-[#33475f]"
                          }`}
                        />
                        <span>{u.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}</span>
                      </span>

                      {u.id === currentUserId ? (
                        <span className="text-[11px] text-[#33475f] italic">Self</span>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(u.id, u.is_active)}
                          className={`px-2 py-1 rounded-[9px] text-[11px] font-semibold border ${
                            u.is_active
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {u.is_active ? "নিষ্ক্রিয়" : "সক্রিয়"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add User Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={MODAL_TRANSITION}
            className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-lg border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#0F766E]" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  নতুন ব্যবহারকারী তৈরি করুন
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
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
