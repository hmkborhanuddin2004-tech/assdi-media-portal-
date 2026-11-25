"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  UserPlus,
  Loader2,
  Download,
} from "lucide-react";
import type { WorkHistoryReportData } from "@/lib/reports/analytics";
import { DEMO_USERS } from "@/lib/auth/demo-users";

export default function AdminReportsPage() {
  const [report, setReport] = useState<WorkHistoryReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("monthly");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role: selectedRole,
        period: selectedPeriod,
      });

      if (selectedMember && selectedMember !== "all") {
        params.set("user_id", selectedMember);
      }

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReport(data.report);
        }
      }
    } catch (err) {
      console.error("Failed to load reports data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMember, selectedRole, selectedPeriod]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        format: "csv",
        role: selectedRole,
        period: selectedPeriod,
      });

      if (selectedMember && selectedMember !== "all") {
        params.set("user_id", selectedMember);
      }

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (!res.ok) {
        throw new Error("CSV ডাউনলোড ব্যর্থ হয়েছে");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `assdi-media-report-${selectedPeriod}-${
        new Date().toISOString().substring(0, 10)
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to export CSV:", err);
    } finally {
      setExporting(false);
    }
  };

  const teamMembers = Object.values(DEMO_USERS).filter(
    (u) => (u.role === "staff" || u.role === "intern") && u.is_active
  );

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Page Title & Filter Header matching design-reference */}
      <div className="glass-panel p-4 sm:p-5 space-y-3.5">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0b1f3a] tracking-tight">
          Work History &amp; Analytics Reports
        </h1>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Member Name Filter */}
          <div className="relative min-w-[200px]">
            <select
              id="report-name-filter"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full text-xs sm:text-sm font-semibold text-[#0b1f3a] py-2 px-3.5 rounded-[11px] border border-white/80 bg-white/55 focus:bg-white/75 focus:ring-2 focus:ring-[#0F766E]/25 focus:outline-none cursor-pointer"
            >
              <option value="all">Name: All Members</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="relative min-w-[170px]">
            <select
              id="report-role-filter"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full text-xs sm:text-sm font-semibold text-[#0b1f3a] py-2 px-3.5 rounded-[11px] border border-white/80 bg-white/55 focus:bg-white/75 focus:ring-2 focus:ring-[#0F766E]/25 focus:outline-none cursor-pointer"
            >
              <option value="all">Role: Staff / Intern</option>
              <option value="staff">Staff Only</option>
              <option value="intern">Intern Only</option>
            </select>
          </div>

          {/* Period Filter */}
          <div className="relative min-w-[190px]">
            <select
              id="report-period-filter"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full text-xs sm:text-sm font-semibold text-[#0b1f3a] py-2 px-3.5 rounded-[11px] border border-white/80 bg-white/55 focus:bg-white/75 focus:ring-2 focus:ring-[#0F766E]/25 focus:outline-none cursor-pointer"
            >
              <option value="monthly">Period: Monthly (Nov 2026)</option>
              <option value="weekly">Period: Weekly</option>
              <option value="daily">Period: Daily</option>
              <option value="all">Period: All Time</option>
            </select>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            id="report-export-csv-btn"
            onClick={handleExportCsv}
            disabled={exporting || loading}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-[11px] bg-[#0F766E] hover:bg-[#0b5a54] text-white text-xs sm:text-sm font-bold shadow-[0_6px_14px_rgba(15,118,110,0.3)] transition-all duration-150 cursor-pointer disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-[#33475f] font-medium glass-panel">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#0F766E]" />
          <span>অ্যানালিটিক্স ডাটা গণনা করা হচ্ছে...</span>
        </div>
      ) : report ? (
        <>
          {/* Top 3 KPI Cards matching mockup */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="report-kpi-cards">
            {/* Card 1: Completed Projects */}
            <div className="glass-panel p-5 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#33475f] block">
                Completed Projects
              </span>
              <div
                id="kpi-completed-projects"
                className="text-3xl font-extrabold text-[#0b1f3a] tracking-tight"
              >
                {report.completed_projects_count}
              </div>
            </div>

            {/* Card 2: Total Field & Editing Hours */}
            <div className="glass-panel p-5 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#33475f] block">
                Total Field &amp; Editing Hours
              </span>
              <div
                id="kpi-total-hours"
                className="text-3xl font-extrabold text-[#0b1f3a] tracking-tight"
              >
                {report.total_field_and_edit_hours} <span className="text-lg font-bold text-[#33475f]">hrs</span>
              </div>
            </div>

            {/* Card 3: On-Time Deadlines */}
            <div className="glass-panel p-5 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#33475f] block">
                On-Time Deadlines
              </span>
              <div
                id="kpi-on-time-deadlines"
                className="text-3xl font-extrabold text-[#0b1f3a] tracking-tight"
              >
                {report.on_time_deadlines_pct}%
              </div>
            </div>
          </div>

          {/* Main 2-Column Content Layout matching mockup */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left 8 Cols: Team Performance Report Table & SVG Velocity Chart */}
            <div className="lg:col-span-8 glass-panel p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-white/60 pb-3">
                <h2 className="text-[15.5px] font-bold text-[#0b1f3a]">
                  Team Performance Report
                </h2>
                <span className="text-xs font-semibold text-[#33475f]">
                  {report.period_label}
                </span>
              </div>

              {/* Monthly Velocity & Workload Distribution SVG Chart */}
              <div className="p-4 rounded-[14px] bg-white/35 border border-white/65 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#0b1f3a]">
                  <span>Weekly Output &amp; Completion Velocity</span>
                  <span className="text-[11px] text-[#0F766E] font-bold">100% Target Met</span>
                </div>
                <div className="h-24 w-full flex items-end gap-3 pt-3 px-2">
                  <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] font-bold text-[#33475f]">42h</span>
                    <div className="w-full bg-[#0F766E]/25 hover:bg-[#0F766E]/35 rounded-t-md h-3/5 transition-all" />
                    <span className="text-[10px] font-semibold text-[#33475f]">W1</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] font-bold text-[#33475f]">58h</span>
                    <div className="w-full bg-[#0F766E]/45 hover:bg-[#0F766E]/55 rounded-t-md h-4/5 transition-all" />
                    <span className="text-[10px] font-semibold text-[#33475f]">W2</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] font-bold text-[#33475f]">65h</span>
                    <div className="w-full bg-[#0F766E]/70 hover:bg-[#0F766E]/80 rounded-t-md h-5/6 transition-all" />
                    <span className="text-[10px] font-semibold text-[#33475f]">W3</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] font-bold text-[#0F766E]">74h</span>
                    <div className="w-full bg-[#0F766E] rounded-t-md h-full transition-all shadow-xs" />
                    <span className="text-[10px] font-bold text-[#0F766E]">W4</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px]" id="team-performance-table">
                  <thead className="bg-white/30 text-[#33475f] text-[10px] font-bold uppercase tracking-[0.13em] border-b border-white/70">
                    <tr>
                      <th className="py-3 px-3">Member</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3 text-center">Projects</th>
                      <th className="py-3 px-3 text-center">Field Hrs</th>
                      <th className="py-3 px-3 text-center">Edit Hrs</th>
                      <th className="py-3 px-3 text-right">Deadline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/45">
                    {report.team_performance.map((m) => (
                      <tr
                        key={m.member_id}
                        className="hover:bg-white/30 transition-colors"
                      >
                        <td className="py-3 px-3 font-bold text-[#0b1f3a] whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-white/60 border border-white/80 text-[#0b1f3a] flex items-center justify-center font-bold text-xs shrink-0">
                              {m.full_name.charAt(0)}
                            </div>
                            <span>{m.full_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[#33475f] font-medium whitespace-nowrap capitalize">
                          {m.role === "staff" ? "Staff" : "Intern"}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-[#0b1f3a]">
                          {m.projects_count}
                        </td>
                        <td className="py-3 px-3 text-center text-[#0b1f3a] whitespace-nowrap font-semibold">
                          {m.field_hours}h
                        </td>
                        <td className="py-3 px-3 text-center text-[#0b1f3a] whitespace-nowrap font-semibold">
                          {m.edit_hours}h
                        </td>
                        <td className="py-3 px-3 text-right font-bold whitespace-nowrap">
                          <span
                            className={
                              m.deadline_pct >= 90
                                ? "text-[#15803d]"
                                : "text-[#b45309]"
                            }
                          >
                            {m.deadline_pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 4 Cols: User Management Box matching mockup */}
            <div className="lg:col-span-4 glass-panel p-5 space-y-4">
              <div className="space-y-0.5 border-b border-white/60 pb-3">
                <h3 className="text-[15.5px] font-bold text-[#0b1f3a]">
                  User Management
                </h3>
                <span className="text-xs text-[#33475f] font-medium block font-mono">
                  (/admin/users)
                </span>
              </div>

              {/* Neutral Role Pills from mockup */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-[#0f766e]/15 text-[#0b5a54] border border-[#0f766e]/25 text-xs font-semibold">
                  Media Head
                </span>
                <span className="px-3 py-1 rounded-full bg-teal-500/12 text-[#0f766e] border border-teal-500/20 text-xs font-semibold">
                  Coordinator
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-700/10 text-[#0b1f3a] border border-slate-500/20 text-xs font-semibold">
                  Staff
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-500/10 text-[#33475f] border border-slate-400/25 text-xs font-semibold">
                  Intern
                </span>
              </div>

              <div className="pt-2">
                <Link
                  href="/admin/users"
                  id="admin-add-user-btn"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0b5a54] text-white text-xs font-bold shadow-[0_6px_14px_rgba(15,118,110,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Add User &amp; Assign Role</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center text-xs text-[#33475f] font-medium glass-panel">
          রিপোর্ট ডাটা লোড করতে ব্যর্থ হয়েছে।
        </div>
      )}
    </div>
  );
}
