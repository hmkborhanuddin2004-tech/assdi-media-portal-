"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Kanban,
  Clock,
  CheckCircle2,
  FileText,
  Users,
  Camera,
  MapPin,
  ExternalLink,
  Crown,
  ChevronRight,
  AlertCircle,
  Video,
  Loader2,
} from "lucide-react";
import type { TaskStage } from "@/lib/types/database";
import type { EnrichedTask, ShootSlipData } from "@/lib/tasks/store";
import type { UserProfile } from "@/lib/types/auth";
import { TASK_STAGE_LABELS, GOOGLE_DRIVE_URL_REGEX } from "@/lib/validations/tasks";
import { ShootAssignmentSlipModal } from "@/components/tasks/ShootAssignmentSlipModal";

export default function StaffTasksPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<EnrichedTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Shoot Slip Modal state
  const [activeSlip, setActiveSlip] = useState<ShootSlipData | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  // Drive URL Dialog for Staff Lead
  const [editingDriveTaskId, setEditingDriveTaskId] = useState<string | null>(null);
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [driveUrlError, setDriveUrlError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchUserDataAndTasks = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }

      const tasksRes = await fetch("/api/tasks");
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        if (tasksData.tasks) {
          setTasks(tasksData.tasks);
        }
      }
    } catch (err) {
      console.error("Failed to load staff tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserDataAndTasks();
  }, [fetchUserDataAndTasks]);

  // Stage transition for Staff Lead
  const handleStageChange = async (taskId: string, targetStage: TaskStage, driveUrl?: string) => {
    setStatusMessage(null);
    setUpdatingTaskId(taskId);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: targetStage,
          final_drive_url: driveUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMessage({
          type: "error",
          text: data.error || "টাস্ক স্টেজ আপডেট করা সম্ভব হয়নি। (tasks_lead_staff_update)",
        });
        return;
      }

      setStatusMessage({
        type: "success",
        text: `টাস্ক স্টেজ সফলভাবে "${TASK_STAGE_LABELS[targetStage].bn}"-এ পরিবর্তিত হয়েছে।`,
      });
      setEditingDriveTaskId(null);
      setDriveUrlInput("");
      fetchUserDataAndTasks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "সার্ভার এরর।";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleOpenSlip = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.slip) {
          setActiveSlip(data.slip);
          setShowSlipModal(true);
        }
      }
    } catch (err) {
      console.error("Failed to load shoot slip:", err);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-5 md:p-6 border border-emerald-600/20 bg-white/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
            <Kanban className="w-3.5 h-3.5" />
            <span>পার্মানেন্ট স্টাফ পোর্টাল • টাস্ক এক্সিকিউশন</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
            নির্ধারিত শুটিং ও পোস্ট-প্রোডাকশন টাস্ক
          </h1>
          <p className="text-xs text-slate-500">
            প্রজেক্ট লিড হিসেবে আপনার দায়িত্বে থাকা প্রজেক্টের স্টেজ (Shoot Done, Editing, Review) আপডেট করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/staff/intern-status"
            id="staff-intern-status-btn"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
          >
            <Users className="w-4 h-4 text-[#0F766E]" />
            <span>ইন্টার্ন ট্র্যাকিং</span>
          </Link>
          <Link
            href="/staff/daily-log"
            id="staff-daily-log-btn"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-xs transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>দৈনিক লগ লিখুন</span>
          </Link>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          id="staff-tasks-status-banner"
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
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

      {/* Active Assigned Tasks List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>আপনার অ্যাসাইন করা টাস্ক সমূহ</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              {tasks.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 glass-panel rounded-xl">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0F766E] mb-2" />
            <span>টাস্ক লোড হচ্ছে...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 glass-panel rounded-xl border border-dashed border-slate-200">
            বর্তমানে আপনার কোনো নির্ধারিত শুটিং বা এডিটিং টাস্ক নেই।
          </div>
        ) : (
          <div className="space-y-4" id="staff-tasks-list">
            {tasks.map((task) => {
              const isProjectLead = currentUser?.id === task.lead_staff_id;
              const isCompleted = task.stage === "completed";

              return (
                <div
                  key={task.id}
                  id={`staff-task-card-${task.id}`}
                  className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-[#0F766E]/40 transition-all bg-white/95 space-y-4"
                >
                  {/* Top Bar: Course, Status Badge, Countdown */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Stage Badge */}
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                        {TASK_STAGE_LABELS[task.stage]?.en} ({TASK_STAGE_LABELS[task.stage]?.bn})
                      </span>

                      {/* Lead Badge */}
                      {isProjectLead ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0F766E] text-[11px] font-bold" id={`lead-badge-${task.id}`}>
                          <Crown className="w-3 h-3" />
                          <span>Project Lead</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium">
                          টিম মেম্বার (লিড: {task.lead_name})
                        </span>
                      )}

                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {task.course_name}
                      </h3>
                    </div>

                    {/* Deadline Countdown */}
                    {!isCompleted && task.deadline_at && (
                      <span
                        className={`text-xs font-semibold flex items-center gap-1 ${
                          task.is_overdue ? "text-rose-600 font-bold" : "text-slate-600"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>ডেডলাইন: {task.countdown_label}</span>
                      </span>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">ফরম্যাট ও অনুপাত</span>
                      <span className="font-semibold text-slate-800">
                        {task.format_duration} ({task.framing_type})
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">ভেন্যু ও কল টাইম</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{task.venue_name} • {task.call_time}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">র ফুটেজ আপলোড</span>
                      {task.raw_footage_uploaded ? (
                        <span className="font-semibold text-emerald-600 flex items-center gap-1" id={`footage-status-${task.id}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>আপলোডেড ✓</span>
                        </span>
                      ) : (
                        <span className="font-medium text-amber-600 flex items-center gap-1" id={`footage-status-${task.id}`}>
                          <Clock className="w-3 h-3" />
                          <span>পেন্ডিং (ইন্টার্ন ড্রাইভ লিংক)</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">অ্যাসাইন করা গিয়ার</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1 truncate" title={task.gear_summary}>
                        <Camera className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{task.gear_summary}</span>
                      </span>
                    </div>
                  </div>

                  {/* Team Members Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                    <span className="text-slate-400 text-[11px] mr-1">টিম:</span>
                    {task.assignees.map((m) => (
                      <span
                        key={m.user_id}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium ${
                          m.assignment_role === "lead"
                            ? "bg-emerald-50 text-[#0F766E] border border-emerald-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <span>{m.full_name}</span>
                        {m.assignment_role === "lead" && <Crown className="w-2.5 h-2.5" />}
                        <span className="text-slate-400">({m.phone})</span>
                      </span>
                    ))}
                  </div>

                  {/* Google Drive Link if Attached */}
                  {task.final_drive_url && (
                    <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between text-xs">
                      <span className="text-teal-900 font-semibold flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-[#0F766E]" />
                        <span>গুগল ড্রাইভ ডেলিভারি লিংক সংযুক্ত রয়েছে</span>
                      </span>
                      <a
                        href={task.final_drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#0F766E] hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <span>লিংক খুলুন</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                    {/* View Shoot Slip Button */}
                    <button
                      onClick={() => handleOpenSlip(task.id)}
                      id={`staff-view-slip-btn-${task.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
                      <span>শুটিং স্লিপ ও WhatsApp শেয়ার</span>
                    </button>

                    {/* Staff Project Lead Controls (Enforced by RLS tasks_lead_staff_update) */}
                    {isProjectLead ? (
                      <div className="flex flex-wrap items-center gap-2 ml-auto" id={`lead-controls-${task.id}`}>
                        {/* Transition buttons depending on current stage */}
                        {task.stage === "shoot_assigned" && (
                          <button
                            onClick={() => handleStageChange(task.id, "shoot_done")}
                            disabled={updatingTaskId === task.id}
                            id={`mark-shoot-done-btn-${task.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
                          >
                            <span>Mark Shoot Done</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}

                        {task.stage === "shoot_done" && (
                          <button
                            onClick={() => handleStageChange(task.id, "editing")}
                            disabled={updatingTaskId === task.id}
                            id={`start-editing-btn-${task.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
                          >
                            <span>Start Editing</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}

                        {task.stage === "editing" && (
                          <button
                            onClick={() => handleStageChange(task.id, "review")}
                            disabled={updatingTaskId === task.id}
                            id={`submit-review-btn-${task.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
                          >
                            <span>Submit for Review</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}

                        {/* Attach Drive URL Button */}
                        <button
                          onClick={() => {
                            setEditingDriveTaskId(task.id);
                            setDriveUrlInput(task.final_drive_url || "");
                            setDriveUrlError(null);
                          }}
                          id={`attach-drive-btn-${task.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-teal-600/30 bg-teal-50 hover:bg-teal-100 text-[#0F766E] text-xs font-semibold shadow-2xs transition-all"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>{task.final_drive_url ? "ড্রাইভ লিংক এডিট" : "ড্রাইভ লিংক সংযুক্ত করুন"}</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic ml-auto">
                        শুধুমাত্র প্রজেক্ট লিড ({task.lead_name}) স্টেজ পরিবর্তন করতে পারেন।
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff Lead Attach Drive URL Modal */}
      {editingDriveTaskId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingDriveTaskId(null);
          }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-[#0F766E]" />
                <span>ফাইনাল গুগল ড্রাইভ ডেলিভারি URL সংযুক্ত করুন</span>
              </h3>
              <button
                onClick={() => setEditingDriveTaskId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {driveUrlError && (
              <div
                id="staff-drive-error-banner"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{driveUrlError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                গুগল ড্রাইভ ফোল্ডার / ফাইল লিংক*
              </label>
              <input
                type="url"
                id="staff-drive-url-input"
                value={driveUrlInput}
                onChange={(e) => {
                  setDriveUrlInput(e.target.value);
                  setDriveUrlError(null);
                }}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                required
              />
              <p className="text-[11px] text-slate-500">
                (PostgreSQL CHECK: final_drive_url ~* &apos;^https://(drive|docs)\.google\.com/&apos;)
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDriveTaskId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                বাতিল
              </button>
              <button
                type="button"
                id="staff-save-drive-btn"
                onClick={() => {
                  if (!driveUrlInput || !GOOGLE_DRIVE_URL_REGEX.test(driveUrlInput)) {
                    setDriveUrlError(
                      'গুগল ড্রাইভ লিংক অবশ্যই "https://drive.google.com/" বা "https://docs.google.com/" দিয়ে শুরু হতে হবে।'
                    );
                    return;
                  }
                  const currentTask = tasks.find((t) => t.id === editingDriveTaskId);
                  if (currentTask) {
                    handleStageChange(editingDriveTaskId, currentTask.stage, driveUrlInput);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-xs"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shoot Slip Modal */}
      <ShootAssignmentSlipModal
        slip={activeSlip}
        isOpen={showSlipModal}
        onClose={() => setShowSlipModal(false)}
      />
    </div>
  );
}
