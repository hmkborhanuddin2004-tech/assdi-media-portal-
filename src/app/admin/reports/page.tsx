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
    <div className="space-y-5 w-full max-w-full">
      {/* Flat Linear/Stripe Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4E4E7]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#09090B] tracking-tight">
          Reports
        </h1>

        <button
          type="button"
          id="report-export-csv-btn"
          onClick={handleExportCsv}
          disabled={exporting || loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D645D] text-white text-xs font-medium cursor-pointer disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E4E4E7] rounded-lg p-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px]">
          <select
            id="report-name-filter"
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="w-full h-8 text-xs font-medium text-[#09090B] px-3 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] focus:bg-white focus:border-[#0F766E] focus:outline-none cursor-pointer"
          >
            <option value="all">Name: All Members</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative min-w-[160px]">
          <select
            id="report-role-filter"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full h-8 text-xs font-medium text-[#09090B] px-3 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] focus:bg-white focus:border-[#0F766E] focus:outline-none cursor-pointer"
          >
            <option value="all">Role: Staff / Intern</option>
            <option value="staff">Staff Only</option>
            <option value="intern">Intern Only</option>
          </select>
        </div>

        <div className="relative min-w-[180px]">
          <select
            id="report-period-filter"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full h-8 text-xs font-medium text-[#09090B] px-3 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] focus:bg-white focus:border-[#0F766E] focus:outline-none cursor-pointer"
          >
            <option value="monthly">Period: Monthly (Nov 2026)</option>
            <option value="weekly">Period: Weekly</option>
            <option value="daily">Period: Daily</option>
            <option value="all">Period: All Time</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E4E4E7] rounded-lg p-12 text-center text-xs text-[#71717A]">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F766E]" />
          <span>Calculating analytics...</span>
        </div>
      ) : report ? (
        <>
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="report-kpi-cards">
            <div className="bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 space-y-1">
              <span className="text-xs font-medium text-[#71717A] block">
                Completed Projects
              </span>
              <div
                id="kpi-completed-projects"
                className="text-2xl font-semibold text-[#09090B] tabular-nums"
              >
                {report.completed_projects_count}
              </div>
            </div>

            <div className="bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 space-y-1">
              <span className="text-xs font-medium text-[#71717A] block">
                Total Field &amp; Editing Hours
              </span>
              <div
                id="kpi-total-hours"
                className="text-2xl font-semibold text-[#09090B] tabular-nums"
              >
                {report.total_field_and_edit_hours}{" "}
                <span className="text-sm font-medium text-[#71717A]">hrs</span>
              </div>
            </div>

            <div className="bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 space-y-1">
              <span className="text-xs font-medium text-[#71717A] block">
                On-Time Deadlines
              </span>
              <div
                id="kpi-on-time-deadlines"
                className="text-2xl font-semibold text-[#09090B] tabular-nums"
              >
                {report.on_time_deadlines_pct}%
              </div>
            </div>
          </div>

          {/* Main 2-Column Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left 8 Cols: Team Performance Report Table */}
            <div className="lg:col-span-8 bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E4E4E7] bg-[#FAFAFA] flex items-center justify-between">
                <h2 className="text-xs font-medium text-[#52525B] uppercase tracking-wider">
                  Team Performance
                </h2>
                <span className="text-xs text-[#71717A] tabular-nums">{report.period_label}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]" id="team-performance-table">
                  <thead className="bg-[#FAFAFA] text-[#71717A] text-[12px] font-medium border-b border-[#E4E4E7]">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Member</th>
                      <th className="py-2.5 px-4 font-medium">Role</th>
                      <th className="py-2.5 px-4 font-medium text-center">Projects</th>
                      <th className="py-2.5 px-4 font-medium text-center">Field Hrs</th>
                      <th className="py-2.5 px-4 font-medium text-center">Edit Hrs</th>
                      <th className="py-2.5 px-4 font-medium text-right">Deadline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7]">
                    {report.team_performance.map((m) => (
                      <tr key={m.member_id} className="h-12 hover:bg-[#F9FAFB]">
                        <td className="py-2.5 px-4 font-medium text-[#09090B] whitespace-nowrap">
                          {m.full_name}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F4F4F5] text-[#27272A] border border-[#E4E4E7]">
                            {m.role === "staff" ? "Staff" : "Intern"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-medium text-[#09090B] tabular-nums">
                          {m.projects_count}
                        </td>
                        <td className="py-2.5 px-4 text-center text-[#52525B] whitespace-nowrap tabular-nums">
                          {m.field_hours}h
                        </td>
                        <td className="py-2.5 px-4 text-center text-[#52525B] whitespace-nowrap tabular-nums">
                          {m.edit_hours}h
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap tabular-nums">
                          <span
                            className={
                              m.deadline_pct >= 90 ? "text-[#0F766E]" : "text-[#52525B]"
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

            {/* Right 4 Cols: Directory Roles */}
            <div className="lg:col-span-4 bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 space-y-4">
              <div className="border-b border-[#E4E4E7] pb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[#09090B]">
                  Directory Roles
                </h3>
                <span className="text-xs text-[#71717A] font-mono">/admin/users</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {["Media Head", "Coordinator", "Staff", "Intern"].map((roleLabel) => (
                  <span
                    key={roleLabel}
                    className="px-2.5 py-1 rounded-md bg-[#F4F4F5] text-[#27272A] border border-[#E4E4E7] text-xs font-medium"
                  >
                    {roleLabel}
                  </span>
                ))}
              </div>

              <div className="pt-1">
                <Link
                  href="/admin/users"
                  id="admin-add-user-btn"
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3.5 rounded-lg bg-[#0F766E] hover:bg-[#0D645D] text-white text-xs font-medium"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add User &amp; Assign Role</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white border border-[#E4E4E7] rounded-lg p-12 text-center text-xs text-[#71717A]">
          Failed to load report data.
        </div>
      )}
    </div>
  );
}
