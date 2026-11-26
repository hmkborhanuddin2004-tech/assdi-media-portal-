"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Filter,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
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
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#27272A] text-[11px] font-medium">
          {cat?.labelEn || log.work_category}
        </span>
      );
    }
    if (log.log_role === "intern") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#27272A] text-[11px] font-medium">
          {log.shoot_location_type === "outdoor" ? "Outdoor Field" : "Indoor Lab"}
        </span>
      );
    }
    return <span className="text-[#71717A]">—</span>;
  };

  return (
    <div className="space-y-5 w-full max-w-full">
      {/* Flat Linear/Stripe Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4E4E7]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#09090B] tracking-tight">
          Daily Logs
        </h1>

        <Link
          href="/admin/reports"
          id="admin-reports-btn"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D645D] text-white text-xs font-medium"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Reports</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E4E4E7] rounded-lg p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 min-w-[190px]">
          <User className="w-3.5 h-3.5 text-[#71717A]" />
          <select
            id="admin-log-member-filter"
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="w-full h-8 text-xs font-medium text-[#09090B] px-2.5 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] focus:bg-white focus:border-[#0F766E] focus:outline-none cursor-pointer"
          >
            <option value="all">Name: All Members</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} ({m.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 min-w-[150px]">
          <Filter className="w-3.5 h-3.5 text-[#71717A]" />
          <select
            id="admin-log-role-filter"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full h-8 text-xs font-medium text-[#09090B] px-2.5 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] focus:bg-white focus:border-[#0F766E] focus:outline-none cursor-pointer"
          >
            <option value="all">Role: Staff / Intern</option>
            <option value="staff">Staff Only</option>
            <option value="intern">Intern Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2 min-w-[170px]">
          <Calendar className="w-3.5 h-3.5 text-[#71717A]" />
          <select
            id="admin-log-period-filter"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full h-8 text-xs font-medium text-[#09090B] px-2.5 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] focus:bg-white focus:border-[#0F766E] focus:outline-none cursor-pointer"
          >
            <option value="monthly">Period: Monthly (Nov 2026)</option>
            <option value="weekly">Period: Weekly</option>
            <option value="daily">Period: Daily</option>
            <option value="all">Period: All Time</option>
          </select>
        </div>

        <div className="ml-auto text-xs text-[#71717A] tabular-nums">
          Total: <span className="font-medium text-[#09090B]">{total}</span>
        </div>
      </div>

      {/* Daily Logs Table */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white border border-[#E4E4E7] rounded-lg p-12 text-center text-xs text-[#71717A]">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F766E]" />
            <span>Loading worklogs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white border border-[#E4E4E7] rounded-lg p-12 text-center text-xs text-[#71717A]">
            No logs found for the selected filters.
          </div>
        ) : (
          <div className="bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]" id="admin-daily-logs-table">
                <thead className="bg-[#FAFAFA] text-[#71717A] text-[12px] font-medium border-b border-[#E4E4E7]">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Date</th>
                    <th className="py-2.5 px-4 font-medium">Member</th>
                    <th className="py-2.5 px-4 font-medium">Role</th>
                    <th className="py-2.5 px-4 font-medium">Category / Location</th>
                    <th className="py-2.5 px-4 font-medium">Hours</th>
                    <th className="py-2.5 px-4 font-medium">Raw Footage</th>
                    <th className="py-2.5 px-4 font-medium">Task Reference</th>
                    <th className="py-2.5 px-4 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7]">
                  {logs.map((log) => (
                    <tr key={log.id} className="h-12 hover:bg-[#F9FAFB]">
                      <td className="py-2.5 px-4 font-mono text-xs text-[#52525B] whitespace-nowrap tabular-nums">
                        {log.log_date}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#09090B] whitespace-nowrap">
                        {log.user_name}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-[#F4F4F5] text-[#27272A] border border-[#E4E4E7] text-[11px] font-medium">
                          {log.log_role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {formatCategoryBadge(log)}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#09090B] whitespace-nowrap tabular-nums">
                        {log.hours_spent} hrs
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {log.log_role === "intern" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#27272A]">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                log.raw_footage_uploaded ? "bg-[#0F766E]" : "bg-[#A1A1AA]"
                              }`}
                            />
                            <span>{log.raw_footage_uploaded ? "Uploaded" : "Pending"}</span>
                          </span>
                        ) : (
                          <span className="text-[#D4D4D8]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#52525B] whitespace-nowrap">
                        {log.course_name || log.task_title || "General"}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#52525B] max-w-sm line-clamp-2">
                        {log.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Server-side Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#E4E4E7] text-xs tabular-nums">
            <span className="text-[#52525B]">
              Page <span className="font-medium text-[#09090B]">{page}</span> of{" "}
              <span className="font-medium text-[#09090B]">{totalPages}</span> ({total} logs)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                id="admin-log-prev-page-btn"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-md border border-[#E4E4E7] hover:bg-[#F4F4F5] text-[#52525B] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="admin-log-next-page-btn"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md border border-[#E4E4E7] hover:bg-[#F4F4F5] text-[#52525B] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
