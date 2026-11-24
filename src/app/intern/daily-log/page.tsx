"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  Loader2,
  FileText,
  RotateCcw,
} from "lucide-react";
import type { ShootLocationType } from "@/lib/types/database";
import type { UserProfile } from "@/lib/types/auth";
import type { EnrichedTask } from "@/lib/tasks/store";
import type { EnrichedDailyLog } from "@/lib/daily-logs/store";

const LOCAL_STORAGE_DRAFT_KEY = "assdi_intern_daily_log_draft_v1";

export default function InternDailyLogPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [assignedTasks, setAssignedTasks] = useState<EnrichedTask[]>([]);
  const [recentLogs, setRecentLogs] = useState<EnrichedDailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Form Fields matching mobile frame mockup
  const [hours, setHours] = useState<string>("4.5");
  const [locationType, setLocationType] = useState<ShootLocationType>("outdoor");
  const [footageUploaded, setFootageUploaded] = useState<boolean>(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Status message
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load User, Tasks, and Logs
  const loadData = useCallback(async () => {
    try {
      const [meRes, tasksRes, logsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/tasks"),
        fetch("/api/daily-logs?limit=10"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }

      let activeTasks: EnrichedTask[] = [];
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        if (tasksData.tasks) {
          activeTasks = tasksData.tasks;
          setAssignedTasks(activeTasks);
        }
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData.logs) {
          setRecentLogs(logsData.logs);
        }
      }

      // Check LocalStorage Draft
      try {
        const savedDraftStr = localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY);
        if (savedDraftStr) {
          const draft = JSON.parse(savedDraftStr);
          if (draft.hours) setHours(draft.hours);
          if (draft.locationType) setLocationType(draft.locationType);
          if (draft.footageUploaded !== undefined)
            setFootageUploaded(draft.footageUploaded);
          if (draft.taskId) setSelectedTaskId(draft.taskId);
          if (draft.notes) setNotes(draft.notes);
          setDraftRestored(true);
        } else if (activeTasks.length > 0) {
          // Preselect today's first assigned task if no draft
          setSelectedTaskId(activeTasks[0].id);
        }
      } catch {
        // LocalStorage access issues in private mode
      }
    } catch (err) {
      console.error("Failed to load intern daily log data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-save draft to LocalStorage for weak outdoor networks
  useEffect(() => {
    if (loading) return;
    try {
      const draft = {
        hours,
        locationType,
        footageUploaded,
        taskId: selectedTaskId,
        notes,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Ignore storage quota errors
    }
  }, [hours, locationType, footageUploaded, selectedTaskId, notes, loading]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
      setHours("4.5");
      setLocationType("outdoor");
      setFootageUploaded(true);
      setNotes("");
      setDraftRestored(false);
    } catch {
      // Ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      setStatusMessage({
        type: "error",
        text: "কাজের ঘণ্টা অবশ্যই ০ এর বেশি এবং ২৪ এর কম বা সমান হতে হবে।",
      });
      return;
    }

    if (!notes.trim()) {
      setStatusMessage({
        type: "error",
        text: "কাজের সংক্ষিপ্ত সারাংশ বা মন্তব্য পূরণ করুন। (notes required)",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/daily-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shoot_location_type: locationType,
          raw_footage_uploaded: footageUploaded,
          hours_spent: hoursNum,
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
        text: footageUploaded
          ? "দৈনিক লগ সফলভাবে সংরক্ষিত হয়েছে এবং টাস্ক বোর্ডে র-ফুটেজ স্ট্যাটাস সিঙ্ক হয়েছে! (trg_sync_raw_footage_to_task)"
          : "দৈনিক কাজের লগ সফলভাবে ডাটাবেজে সংরক্ষিত হয়েছে!",
      });

      // Clear draft after successful submission
      try {
        localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
      } catch {
        // Ignore
      }
      setNotes("");
      setDraftRestored(false);

      // Refresh recent logs
      const refreshed = await fetch("/api/daily-logs?limit=10");
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

  // Find the selected task for detail banner
  const todayShootTask =
    assignedTasks.find((t) => t.id === selectedTaskId) || assignedTasks[0];

  return (
    <div className="space-y-4 w-full max-w-xl mx-auto pb-8">
      {/* Top Banner (Mobile Frame from mockup) */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-emerald-600/20 bg-white/90 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ইন্টার্ন ও ট্রেইনি পোর্টাল</span>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            {currentUser?.full_name || "Intern"}
          </span>
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          দৈনিক কাজের লগ ও ফুটেজ স্ট্যাটাস
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          দুর্বল ফিল্ড নেটওয়ার্কের জন্য অফলাইন ড্রাফট স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকে।
          র-ফুটেজ আপলোড মার্ক করলে মূল টাস্ক বোর্ডে সাথে সাথে আপডেট হবে।
        </p>
      </div>

      {/* Today's Shoot Card matching mockup top card */}
      <div
        id="intern-today-shoot-card"
        className="rounded-2xl p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-600/25 shadow-xs space-y-1.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Today&apos;s Shoot:
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
            Assigned
          </span>
        </div>
        {todayShootTask ? (
          <div>
            <div className="text-sm font-bold text-slate-900">
              {todayShootTask.course_name} • {todayShootTask.call_time || "09:00 AM"}
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>{todayShootTask.venue_name || "50 Katha Campus"}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-600">
            The Art of Creation • 09:00 AM | 50 Katha Campus
          </div>
        )}
      </div>

      {/* Draft Restored Notice Banner */}
      {draftRestored && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
          <span>অফলাইন ড্রাফট রিস্টোর করা হয়েছে।</span>
          <button
            type="button"
            onClick={handleClearDraft}
            className="text-[11px] font-semibold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>মুছে ফেলুন</span>
          </button>
        </div>
      )}

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          id="intern-log-status-banner"
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Intern Daily Log Form matching mockup */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs bg-white space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Intern Daily Log</h2>
          <p className="text-[11px] text-slate-400">
            সময়কাল, লোকেশন এবং র-ফুটেজ ড্রাইভে জমা দেওয়ার তথ্য দিন
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Associated Task Selector */}
          <div className="space-y-1">
            <label
              htmlFor="intern-task-select"
              className="block text-xs font-bold text-slate-700"
            >
              নির্ধারিত শুটিং / টাস্ক (Task Reference)
            </label>
            <select
              id="intern-task-select"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-[#0F766E] focus:outline-none bg-white cursor-pointer"
            >
              {assignedTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.course_name} • {t.call_time} ({t.venue_name})
                </option>
              ))}
              <option value="">— অন্যান্য বা জেনারেল ফিল্ড ডিউটি —</option>
            </select>
          </div>

          {/* Hours Input */}
          <div className="space-y-1">
            <label
              htmlFor="intern-hours-input"
              className="block text-xs font-bold text-slate-700"
            >
              Hours <span className="text-slate-400 font-normal">/ কাজের সময়কাল</span>
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                id="intern-hours-input"
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="4.5"
                required
                className="w-full pl-9 pr-12 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                hrs
              </span>
            </div>
          </div>

          {/* Indoor / Outdoor Toggle Buttons */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Indoor / Outdoor{" "}
              <span className="text-slate-400 font-normal">/ শুটিংয়ের লোকেশন</span>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                id="intern-indoor-btn"
                onClick={() => setLocationType("indoor")}
                className={`py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  locationType === "indoor"
                    ? "bg-[#0F766E] text-white border-[#0F766E] shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Indoor</span>
              </button>
              <button
                type="button"
                id="intern-outdoor-btn"
                onClick={() => setLocationType("outdoor")}
                className={`py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  locationType === "outdoor"
                    ? "bg-[#0F766E] text-white border-[#0F766E] shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Outdoor</span>
              </button>
            </div>
          </div>

          {/* Raw Footage Uploaded to Drive: YES / Switch Toggle */}
          <div
            id="intern-footage-toggle-container"
            className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
          >
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 block">
                Raw Footage Uploaded to Drive:{" "}
                <span
                  className={
                    footageUploaded ? "text-emerald-700 font-black" : "text-slate-500"
                  }
                >
                  {footageUploaded ? "YES" : "NO"}
                </span>
              </span>
              <span className="text-[11px] text-slate-500 block">
                {footageUploaded
                  ? "✓ সাবমিট করলে টাস্ক বোর্ডে 'Raw Uploaded' ব্যাজ সক্রিয় হবে"
                  : "ড্রাইভে ফুটেজ কপি করার পর টিক দিন"}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="intern-footage-switch"
                type="checkbox"
                checked={footageUploaded}
                onChange={(e) => setFootageUploaded(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F766E]"></div>
            </label>
          </div>

          {/* Task Summary / Notes Textarea */}
          <div className="space-y-1">
            <label
              htmlFor="intern-notes-input"
              className="block text-xs font-bold text-slate-700"
            >
              Task Summary{" "}
              <span className="text-slate-400 font-normal">/ কাজের বিবরণ</span>
            </label>
            <textarea
              id="intern-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Some B-roll of the main courtyard, interviewed 3..."
              required
              className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-[#0F766E] focus:outline-none leading-relaxed placeholder:text-slate-400"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="intern-submit-log-btn"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-bold shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>সাবমিট করা হচ্ছে...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Log</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Recent Submitted Logs for Intern */}
      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>আপনার সাম্প্রতিক সাবমিট করা লগ ({recentLogs.length})</span>
        </h3>
        {recentLogs.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200/80">
            এখনও কোনো লগ সাবমিট করা হয়নি।
          </div>
        ) : (
          <div className="space-y-2" id="intern-recent-logs-list">
            {recentLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-slate-200/80 bg-white text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    {log.log_date} • {log.hours_spent} hrs
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.raw_footage_uploaded
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {log.raw_footage_uploaded ? "Raw Uploaded ✓" : "Pending Raw"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {log.shoot_location_type === "outdoor" ? "Outdoor" : "Indoor"}
                  {log.course_name ? ` • ${log.course_name}` : ""}
                </div>
                <p className="text-slate-600 line-clamp-2 text-[11px]">
                  {log.notes}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
