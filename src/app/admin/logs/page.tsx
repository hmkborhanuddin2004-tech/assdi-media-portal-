"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Filter,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  Calendar,
} from "lucide-react";
import type { EnrichedDailyLog } from "@/lib/daily-logs/store";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { STAFF_WORK_CATEGORIES } from "@/lib/validations/daily-logs";

export default function AdminDailyLogsPage() {
  const [logs, setRecentLogs] = useState<EnrichedDailyLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("monthly");

  const fetchLogs = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: "10",
          role: selectedRole,
          period: selectedPeriod,
        });

        if (selectedMember && selectedMember !== "all") {
          params.set("user_id", selectedMember);
        }

        const res = await fetch(`/api/daily-logs?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setRecentLogs(data.logs);
            setTotal(data.total);
            setPage(data.page);
            setTotalPages(data.totalPages);
          }
        }
      } catch (err) {
        console.error("Failed to load admin daily logs:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedMember, selectedRole, selectedPeriod]
  );

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [fetchLogs]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      fetchLogs(newPage);
    }
  };

  const teamMembers = Object.values(DEMO_USERS).filter(
    (u) => (u.role === "staff" || u.role === "intern") && u.is_active
  );

  const formatCategoryBadge = (log: EnrichedDailyLog) => {
    if (log.log_role === "staff" && log.work_category) {
      const cat = STAFF_WORK_CATEGORIES.find((c) => c.value === log.work_category);
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-semibold">
          {cat?.labelEn || log.work_category}
        </span>
      );
    }
    if (log.log_role === "intern") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/60 text-[11px] font-semibold">
          {log.shoot_location_type === "outdoor" ? "Outdoor Field" : "Indoor Lab"}
        </span>
      );
    }
    return <span className="text-slate-400">—</span>;
  };

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Top Banner */}
      <div className="glass-panel p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0f766e]/15 text-[#0b5a54] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>মিডিয়া প্রধান কন্ট্রোল প্যানেল</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0b1f3a] tracking-tight">
            All-Team Daily Worklogs
          </h1>
          <p className="text-xs sm:text-[13px] text-[#33475f] font-medium">
            স্টাফ ও ইন্টার্ন টিমের সাবমিট করা সকল দৈনিক কাজের লগ, কর্মঘণ্টা ও র-ফুটেজ স্ট্যাটাস।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/reports"
            id="admin-reports-btn"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[11px] bg-[#0F766E] hover:bg-[#0b5a54] text-white text-xs font-semibold shadow-[0_6px_14px_rgba(15,118,110,0.3)] transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>অ্যানালিটিক্স ও রিপোর্ট</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 flex flex-wrap items-center gap-3">
        {/* Member dropdown */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <User className="w-4 h-4 text-[#33475f]" />
          <select
            id="admin-log-member-filter"
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="w-full text-xs font-semibold text-[#0b1f3a] p-2 rounded-[11px] border border-white/80 bg-white/55 focus:bg-white/75 focus:ring-2 focus:ring-[#0F766E]/25 focus:outline-none cursor-pointer"
          >
            <option value="all">Name: All Members</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} ({m.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Role dropdown */}
        <div className="flex items-center gap-2 min-w-[150px]">
          <Filter className="w-4 h-4 text-[#33475f]" />
          <select
            id="admin-log-role-filter"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full text-xs font-semibold text-[#0b1f3a] p-2 rounded-[11px] border border-white/80 bg-white/55 focus:bg-white/75 focus:ring-2 focus:ring-[#0F766E]/25 focus:outline-none cursor-pointer"
          >
            <option value="all">Role: Staff / Intern</option>
            <option value="staff">Staff Only</option>
            <option value="intern">Intern Only</option>
          </select>
        </div>

        {/* Period dropdown */}
        <div className="flex items-center gap-2 min-w-[170px]">
          <Calendar className="w-4 h-4 text-[#33475f]" />
          <select
            id="admin-log-period-filter"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full text-xs font-semibold text-[#0b1f3a] p-2 rounded-[11px] border border-white/80 bg-white/55 focus:bg-white/75 focus:ring-2 focus:ring-[#0F766E]/25 focus:outline-none cursor-pointer"
          >
            <option value="monthly">Period: Monthly (Nov 2026)</option>
            <option value="weekly">Period: Weekly</option>
            <option value="daily">Period: Daily</option>
            <option value="all">Period: All Time</option>
          </select>
        </div>

        <div className="ml-auto text-xs font-bold text-[#33475f]">
          মোট রেকর্ড: <span className="text-[#0F766E] font-extrabold">{total}</span>
        </div>
      </div>

      {/* Daily Logs Table */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#33475f] font-medium glass-panel">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0F766E]" />
            <span>লগ ডাটা লোড হচ্ছে...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#33475f] font-medium glass-panel">
            নির্বাচিত ফিল্টারে কোনো কাজের লগ পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto glass-panel">
            <table className="w-full text-left text-[12.5px]" id="admin-daily-logs-table">
              <thead className="bg-white/30 text-[#33475f] text-[10px] font-bold uppercase tracking-[0.13em] border-b border-white/70">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Category / Location</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Raw Footage</th>
                  <th className="py-3 px-4">Task Reference</th>
                  <th className="py-3 px-4">Work Summary Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                      {log.log_date}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {log.user_name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.log_role === "staff"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {log.log_role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {formatCategoryBadge(log)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {log.hours_spent} hrs
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.log_role === "intern" ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.raw_footage_uploaded
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {log.raw_footage_uploaded ? "Uploaded ✓" : "Pending"}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {log.course_name || log.task_title || "General"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm line-clamp-2">
                      {log.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-side Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs text-xs">
            <span className="text-slate-500 font-medium">
              Page <span className="font-bold text-slate-800">{page}</span> of{" "}
              <span className="font-bold text-slate-800">{totalPages}</span> (Total{" "}
              {total} logs)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                id="admin-log-prev-page-btn"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="admin-log-next-page-btn"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
