"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Film,
  Scissors,
  BookOpen,
  Search,
  FolderGit2,
  Send,
  Loader2,
  Layers,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import type { StaffWorkCategory } from "@/lib/types/database";
import type { UserProfile } from "@/lib/types/auth";
import type { EnrichedTask } from "@/lib/tasks/store";
import type { EnrichedDailyLog } from "@/lib/daily-logs/store";
import { STAFF_WORK_CATEGORIES } from "@/lib/validations/daily-logs";

export default function StaffDailyLogPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<EnrichedTask[]>([]);
  const [recentLogs, setRecentLogs] = useState<EnrichedDailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedCategory, setSelectedCategory] =
    useState<StaffWorkCategory>("daily_cinematography");
  const [hoursSpent, setHoursSpent] = useState<string>("6.5");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Feedback State
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [meRes, tasksRes, logsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/tasks"),
        fetch("/api/daily-logs?user_id=me&period=all&limit=15"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        if (tasksData.tasks) {
          setTasks(tasksData.tasks);
        }
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData.logs) {
          setRecentLogs(logsData.logs);
        }
      }
    } catch (err) {
      console.error("Failed to load staff daily log data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const hours = parseFloat(hoursSpent);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      setStatusMessage({
        type: "error",
        text: "কাজের সময়কাল অবশ্যই ০ থেকে ২৪ ঘণ্টার মধ্যে হতে হবে। (chk_hours_spent)",
      });
      return;
    }

    if (!notes.trim()) {
      setStatusMessage({
        type: "error",
        text: "কাজের বিবরণ বা সংক্ষিপ্ত সারাংশ পূরণ করা আবশ্যক। (notes required)",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/daily-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_category: selectedCategory,
          hours_spent: hours,
          task_id: selectedTaskId || null,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "দৈনিক লগ সাবমিট করতে ব্যর্থ হয়েছে।");
      }

      setStatusMessage({
        type: "success",
        text: "দৈনিক কাজের লগ সফলভাবে সংরক্ষিত হয়েছে! (Saved in PostgreSQL)",
      });
      setNotes("");
      setSelectedTaskId("");

      // Refresh recent logs
      const refreshed = await fetch("/api/daily-logs?user_id=me&period=all&limit=15");
      if (refreshed.ok) {
        const refreshedData = await refreshed.json();
        if (refreshedData.logs) {
          setRecentLogs(refreshedData.logs);
        }
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "সার্ভারে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryIcon = (cat: StaffWorkCategory) => {
    switch (cat) {
      case "daily_cinematography":
        return <Film className="w-3.5 h-3.5" />;
      case "video_editing":
        return <Scissors className="w-3.5 h-3.5" />;
      case "book_review":
        return <BookOpen className="w-3.5 h-3.5" />;
      case "script_research":
        return <Search className="w-3.5 h-3.5" />;
      case "content_management":
        return <FolderGit2 className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-5 w-full max-w-full">
      {/* Flat Linear/Stripe Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4DFD3]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#1A1917] tracking-tight">
          Daily Logs
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/staff/tasks"
            id="staff-my-tasks-link"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4DFD3] bg-white hover:bg-[#EFECE4] text-[#1A1917] text-xs font-medium"
          >
            <Layers className="w-3.5 h-3.5 text-[#78716C]" />
            <span>My Tasks</span>
          </Link>
          <Link
            href="/staff/intern-status"
            id="staff-intern-status-link"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4DFD3] bg-white hover:bg-[#EFECE4] text-[#1A1917] text-xs font-medium"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#78716C]" />
            <span>Intern Status</span>
          </Link>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          id="staff-log-status-banner"
          className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917]"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#0F6B5D] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Worklog Submission Card */}
      <div className="bg-white border border-[#E4DFD3] rounded-lg shadow-[0_1px_2px_rgba(26,25,23,0.04)] p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-[#E4DFD3] pb-3.5">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-[#1A1917]">
              Submit Daily Worklog
            </h2>
            <p className="text-xs text-[#78716C]">
              Category, hours worked, and work summary
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-[#78716C] block">Logged in as</span>
            <span className="text-xs font-medium text-[#1A1917] block">
              {currentUser?.full_name || "Permanent Staff"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Selectable Category */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#57534E]">
              Category
            </label>
            <div className="flex flex-wrap gap-2" id="staff-category-pills">
              {STAFF_WORK_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(cat.value)}
                    data-category={cat.value}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors duration-150 cursor-pointer ${
                      isSelected
                        ? "bg-[#0F6B5D] border-[#0F6B5D] text-white"
                        : "bg-white hover:bg-[#EFECE4] text-[#57534E] border-[#E4DFD3]"
                    }`}
                  >
                    {getCategoryIcon(cat.value)}
                    <span>{cat.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Hours Worked & Optional Task Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="staff-hours-input"
                className="block text-xs font-medium text-[#57534E]"
              >
                Hours Worked
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="staff-hours-input"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={hoursSpent}
                  onChange={(e) => setHoursSpent(e.target.value)}
                  placeholder="e.g. 6.5"
                  required
                  className="w-full pl-9 pr-12 py-2 rounded-lg border border-[#E4DFD3] text-xs sm:text-sm font-medium text-[#1A1917] tabular-nums focus:border-[#0F6B5D] focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs font-medium text-[#78716C] pointer-events-none">
                  hrs
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="staff-task-select"
                className="block text-xs font-medium text-[#57534E]"
              >
                Associated Task (Optional)
              </label>
              <select
                id="staff-task-select"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E4DFD3] text-xs sm:text-sm text-[#1A1917] focus:border-[#0F6B5D] focus:outline-none bg-white cursor-pointer"
              >
                <option value="">— কোনো নির্দিষ্ট টাস্ক নেই (General Work) —</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.course_name} • {task.program_type} ({task.stage})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Short Work Summary */}
          <div className="space-y-1.5">
            <label
              htmlFor="staff-notes-input"
              className="block text-xs font-medium text-[#57534E]"
            >
              Short Work Summary
            </label>
            <textarea
              id="staff-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Captured B-roll of the main courtyard, interviewed 3 senior staff..."
              required
              className="w-full p-3 rounded-lg border border-[#E4DFD3] text-xs sm:text-sm text-[#1A1917] focus:border-[#0F6B5D] focus:outline-none leading-relaxed placeholder:text-[#78716C]"
            />
          </div>

          {/* 4. Submit Button */}
          <button
            type="submit"
            id="staff-submit-log-btn"
            disabled={submitting}
            className="w-full sm:w-auto py-2.5 px-5 rounded-lg bg-[#0F6B5D] hover:bg-[#0B554A] text-white text-xs sm:text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>সংরক্ষণ করা হচ্ছে...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Daily Log</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Project Lead Quick Link */}
      <div className="bg-white border border-[#E4DFD3] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-xs font-semibold text-[#1A1917]">
            Intern Raw Footage Status
          </h3>
          <p className="text-[11px] text-[#78716C]">
            Project Leads can verify and update intern raw footage uploads.
          </p>
        </div>
        <Link
          href="/staff/intern-status"
          className="inline-flex items-center gap-1 text-xs font-medium text-[#0F6B5D] hover:underline"
        >
          <span>Open Intern Status</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Recent Submitted Logs List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1A1917] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#78716C]" />
            <span>Recent Daily Logs</span>
            <span className="px-2 py-0.5 rounded bg-[#EFECE4] border border-[#E4DFD3] text-[#57534E] text-xs font-medium tabular-nums">
              {recentLogs.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#78716C] bg-white border border-[#E4DFD3] rounded-lg">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F6B5D]" />
            <span>লগ ডাটা লোড হচ্ছে...</span>
          </div>
        ) : recentLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#78716C] bg-white border border-[#E4DFD3] rounded-lg">
            এখনও কোনো কাজের লগ সাবমিট করা হয়নি।
          </div>
        ) : (
          <div className="overflow-x-auto bg-white border border-[#E4DFD3] rounded-lg shadow-[0_1px_2px_rgba(26,25,23,0.04)]">
            <table className="w-full text-left text-[13px]" id="staff-recent-logs-table">
              <thead className="bg-[#EFECE4] text-[#57534E] text-xs font-medium border-b border-[#E2DDD2]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Date</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Hours</th>
                  <th className="py-2.5 px-4 font-medium">Task / Course</th>
                  <th className="py-2.5 px-4 font-medium">Summary Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DFD3]">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="h-12 hover:bg-[#FBF9F5] transition-colors duration-150">
                    <td className="py-2.5 px-4 font-medium text-[#1A1917] whitespace-nowrap tabular-nums">
                      {log.log_date}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] font-medium text-[11px]">
                        {log.work_category ? (
                          <>
                            {getCategoryIcon(log.work_category)}
                            <span>
                              {STAFF_WORK_CATEGORIES.find(
                                (c) => c.value === log.work_category
                              )?.labelEn || log.work_category}
                            </span>
                          </>
                        ) : (
                          "General"
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#1A1917] whitespace-nowrap tabular-nums">
                      {log.hours_spent} hrs
                    </td>
                    <td className="py-2.5 px-4 text-[#57534E] whitespace-nowrap">
                      {log.course_name || log.task_title || "—"}
                    </td>
                    <td className="py-2.5 px-4 text-[#57534E] max-w-md line-clamp-2">
                      {log.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
