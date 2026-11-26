"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
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
        fetch("/api/daily-logs?period=all&limit=10"),
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
          if (draft.notes && draft.notes.trim().length > 0) {
            if (draft.hours) setHours(draft.hours);
            if (draft.locationType) setLocationType(draft.locationType);
            if (draft.footageUploaded !== undefined)
              setFootageUploaded(draft.footageUploaded);
            if (draft.taskId) setSelectedTaskId(draft.taskId);
            setNotes(draft.notes);
            setDraftRestored(true);
          } else if (activeTasks.length > 0) {
            setSelectedTaskId(activeTasks[0].id);
          }
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
      if (notes.trim().length > 0) {
        const draft = {
          hours,
          locationType,
          footageUploaded,
          taskId: selectedTaskId,
          notes,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, JSON.stringify(draft));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
      }
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
      const refreshed = await fetch("/api/daily-logs?period=all&limit=10");
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
    <div className="space-y-5 w-full max-w-xl mx-auto pb-8">
      {/* Flat Linear/Stripe Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E4E4E7]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#09090B] tracking-tight">
          Daily Log
        </h1>
        <span className="text-xs font-medium text-[#71717A]">
          {currentUser?.full_name || "Intern"}
        </span>
      </div>

      {/* Today's Shoot Card */}
      <div
        id="intern-today-shoot-card"
        className="bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 space-y-1.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#71717A] uppercase tracking-wider block">
            Today&apos;s Shoot
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#27272A] text-[10px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
            Assigned
          </span>
        </div>
        {todayShootTask ? (
          <div>
            <div className="text-sm font-semibold text-[#09090B]">
              {todayShootTask.course_name} • <span className="tabular-nums">{todayShootTask.call_time || "09:00 AM"}</span>
            </div>
            <div className="text-xs text-[#52525B] flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#71717A]" />
              <span>{todayShootTask.venue_name || "50 Katha Campus"}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#52525B]">
            The Art of Creation • 09:00 AM | 50 Katha Campus
          </div>
        )}
      </div>

      {/* Draft Restored Notice Banner */}
      {draftRestored && (
        <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] text-[#09090B] font-medium text-xs flex items-center justify-between gap-2">
          <span>অফলাইন ড্রাফট রিস্টোর করা হয়েছে।</span>
          <button
            type="button"
            onClick={handleClearDraft}
            className="text-[11px] font-medium text-[#52525B] hover:text-[#09090B] flex items-center gap-1 cursor-pointer"
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
          className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-[#F4F4F5] border border-[#E4E4E7] text-[#09090B]"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Intern Daily Log Form */}
      <div className="bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 sm:p-5 space-y-4">
        <div className="border-b border-[#E4E4E7] pb-3">
          <h2 className="text-sm font-semibold text-[#09090B]">Intern Daily Log</h2>
          <p className="text-[11px] text-[#71717A] mt-0.5">
            সময়কাল, লোকেশন এবং র-ফুটেজ ড্রাইভে জমা দেওয়ার তথ্য দিন
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Associated Task Selector */}
          <div className="space-y-1">
            <label
              htmlFor="intern-task-select"
              className="block text-xs font-medium text-[#52525B]"
            >
              নির্ধারিত শুটিং / টাস্ক (Task Reference)
            </label>
            <select
              id="intern-task-select"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] text-xs sm:text-sm text-[#09090B] focus:border-[#0F766E] focus:outline-none bg-white cursor-pointer"
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
              className="block text-xs font-medium text-[#52525B]"
            >
              Hours <span className="text-[#71717A] font-normal">/ কাজের সময়কাল</span>
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-[#71717A] absolute left-3 top-2.5 pointer-events-none" />
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
                className="w-full pl-9 pr-12 py-2 rounded-lg border border-[#E4E4E7] text-xs sm:text-sm font-medium text-[#09090B] tabular-nums focus:border-[#0F766E] focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs font-medium text-[#71717A] pointer-events-none">
                hrs
              </span>
            </div>
          </div>

          {/* Indoor / Outdoor Toggle Buttons */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#52525B]">
              Indoor / Outdoor{" "}
              <span className="text-[#71717A] font-normal">/ শুটিংয়ের লোকেশন</span>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                id="intern-indoor-btn"
                onClick={() => setLocationType("indoor")}
                className={`py-2 px-3 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer ${
                  locationType === "indoor"
                    ? "bg-[#0F766E] text-white border-[#0F766E]"
                    : "bg-white text-[#52525B] border-[#E4E4E7] hover:bg-[#F4F4F5]"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Indoor</span>
              </button>
              <button
                type="button"
                id="intern-outdoor-btn"
                onClick={() => setLocationType("outdoor")}
                className={`py-2 px-3 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer ${
                  locationType === "outdoor"
                    ? "bg-[#0F766E] text-white border-[#0F766E]"
                    : "bg-white text-[#52525B] border-[#E4E4E7] hover:bg-[#F4F4F5]"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Outdoor</span>
              </button>
            </div>
          </div>

          {/* Raw Footage Uploaded to Drive: Switch Toggle */}
          <div
            id="intern-footage-toggle-container"
            className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] flex items-center justify-between gap-3"
          >
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-[#09090B] block">
                Raw Footage Uploaded to Drive
              </span>
              <span className="text-[11px] text-[#71717A] block">
                {footageUploaded
                  ? "সাবমিট করলে টাস্ক বোর্ডে 'Raw Uploaded' স্ট্যাটাস আপডেট হবে"
                  : "ড্রাইভে ফুটেজ কপি করার পর সুইচ অন করুন"}
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
              <div className="w-10 h-5 bg-[#E4E4E7] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E4E4E7] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0F766E]"></div>
            </label>
          </div>

          {/* Task Summary / Notes Textarea */}
          <div className="space-y-1">
            <label
              htmlFor="intern-notes-input"
              className="block text-xs font-medium text-[#52525B]"
            >
              Task Summary{" "}
              <span className="text-[#71717A] font-normal">/ কাজের বিবরণ</span>
            </label>
            <textarea
              id="intern-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Some B-roll of the main courtyard, interviewed 3..."
              required
              className="w-full p-3 rounded-lg border border-[#E4E4E7] text-xs sm:text-sm text-[#09090B] focus:border-[#0F766E] focus:outline-none leading-relaxed placeholder:text-[#71717A]"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="intern-submit-log-btn"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-[#0F766E] hover:bg-[#0D645D] text-white text-xs sm:text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
      <div className="space-y-2 pt-1">
        <h3 className="text-xs font-semibold text-[#09090B] flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#71717A]" />
          <span>Recent Submitted Logs ({recentLogs.length})</span>
        </h3>
        {recentLogs.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#71717A] bg-white rounded-lg border border-[#E4E4E7]">
            এখনও কোনো লগ সাবমিট করা হয়নি।
          </div>
        ) : (
          <div className="space-y-2" id="intern-recent-logs-list">
            {recentLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-[#E4E4E7] bg-white text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#09090B] tabular-nums">
                    {log.log_date} • {log.hours_spent} hrs
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#27272A] text-[10px] font-medium">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        log.raw_footage_uploaded ? "bg-[#0F766E]" : "bg-[#71717A]"
                      }`}
                    />
                    {log.raw_footage_uploaded ? "Raw Uploaded" : "Pending Raw"}
                  </span>
                </div>
                <div className="text-[11px] text-[#71717A]">
                  {log.shoot_location_type === "outdoor" ? "Outdoor" : "Indoor"}
                  {log.course_name ? ` • ${log.course_name}` : ""}
                </div>
                <p className="text-[#52525B] line-clamp-2 text-[11px]">
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
