"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  Sparkles,
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
    <div className="space-y-4 w-full max-w-full">
      {/* Top Banner (Desktop Staff View matching mockup) */}
      <div className="glass-panel p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0f766e]/15 text-[#0b5a54] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>পার্মানেন্ট স্টাফ পোর্টাল • ডেইলি কাজের লগ</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0b1f3a] tracking-tight">
            Permanent Staff Daily Worklog
          </h1>
          <p className="text-xs sm:text-[13px] text-[#33475f] font-medium">
            আজকের সম্পাদিত কাজের ক্যাটাগরি, সময়কাল ও সারসংক্ষেপ ডাটাবেজে সাবমিট করুন।
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/staff/tasks"
            id="staff-my-tasks-link"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[11px] border border-white/80 bg-white/55 hover:bg-white/80 text-[#0b1f3a] text-xs font-semibold shadow-xs transition-all"
          >
            <Layers className="w-4 h-4 text-[#0F766E]" />
            <span>My Tasks</span>
          </Link>
          <Link
            href="/staff/intern-status"
            id="staff-intern-status-link"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[11px] border border-white/80 bg-white/55 hover:bg-white/80 text-[#0b1f3a] text-xs font-semibold shadow-xs transition-all"
          >
            <UserCheck className="w-4 h-4 text-[#0F766E]" />
            <span>Intern Status</span>
          </Link>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          id="staff-log-status-banner"
          className={`p-4 rounded-[14px] text-xs sm:text-sm font-semibold flex items-center gap-2.5 backdrop-blur-md animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-500/15 border border-emerald-400/35 text-[#0b1f3a]"
              : "bg-red-500/15 border border-red-400/35 text-[#0b1f3a]"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-[#15803d] shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#dc2626] shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Worklog Submission Card matching mockup */}
      <div className="glass-panel p-5 md:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/60 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-bold text-[#0b1f3a]">
              Daily Logs — Submit Daily Worklog
            </h2>
            <p className="text-xs text-[#33475f] font-medium">
              Selectable Category • Hours Worked • Short Work Summary
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-[#33475f] font-medium block">Current User</span>
            <span className="text-xs font-bold text-[#0b1f3a] block">
              {currentUser?.full_name || "Permanent Staff"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Selectable Category (5 Pills from mockup) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Selectable Category
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
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "bg-[#0F766E] text-white shadow-sm ring-2 ring-[#0F766E]/20"
                        : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60"
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
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Hours Worked
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
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
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                  hrs
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="staff-task-select"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Associated Task (Optional)
              </label>
              <select
                id="staff-task-select"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 focus:ring-2 focus:ring-[#0F766E] focus:outline-none bg-white cursor-pointer"
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

          {/* 3. Short Work Summary (Textarea matching mockup placeholder) */}
          <div className="space-y-1.5">
            <label
              htmlFor="staff-notes-input"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
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
              className="w-full p-3.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-[#0F766E] focus:outline-none leading-relaxed placeholder:text-slate-400"
            />
          </div>

          {/* 4. Submit Button matching mockup */}
          <button
            type="submit"
            id="staff-submit-log-btn"
            disabled={submitting}
            className="w-full py-3 px-6 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-bold shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

      {/* Project Lead Update Intern Task Status Banner (Mockup reference) */}
      <div className="glass-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-bold text-[#0b1f3a]">
              Project Lead • Update Intern Task Status
            </h3>
          </div>
          <p className="text-[11px] text-[#33475f] font-medium">
            Hasan Ali (Intern) • Art of Creation Shoot • Raw Uploaded
          </p>
        </div>
        <Link
          href="/staff/intern-status"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#0F766E] hover:underline"
        >
          <span>স্টাফ লিড কন্ট্রোল প্যানেলে যান</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Recent Submitted Logs List (Live PostgreSQL store) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0b1f3a] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0F766E]" />
            <span>আপনার সাম্প্রতিক সাবমিট করা কাজের লগ (Recent Daily Logs)</span>
            <span className="px-2 py-0.5 rounded-full bg-white/60 border border-white/80 text-[#0b1f3a] text-xs font-bold">
              {recentLogs.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#33475f] font-medium glass-panel">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F766E]" />
            <span>লগ ডাটা লোড হচ্ছে...</span>
          </div>
        ) : recentLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#33475f] font-medium glass-panel">
            এখনও কোনো কাজের লগ সাবমিট করা হয়নি।
          </div>
        ) : (
          <div className="overflow-x-auto glass-panel">
            <table className="w-full text-left text-[12.5px]" id="staff-recent-logs-table">
              <thead className="bg-white/30 text-[#33475f] text-[10px] font-bold uppercase tracking-[0.13em] border-b border-white/70">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Task / Course</th>
                  <th className="py-3 px-4">Summary Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                      {log.log_date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-medium text-[11px]">
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
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {log.hours_spent} hrs
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {log.course_name || log.task_title || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-md line-clamp-2">
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
