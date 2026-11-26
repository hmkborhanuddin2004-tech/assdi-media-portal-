"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
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
    <div className="space-y-5 w-full max-w-full">
      {/* Flat Linear/Stripe Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4DFD3]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#1A1917] tracking-tight">
          My Tasks
        </h1>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/staff/intern-status"
            id="staff-intern-status-btn"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4DFD3] bg-white hover:bg-[#EFECE4] text-[#1A1917] text-xs font-medium"
          >
            <Users className="w-3.5 h-3.5 text-[#78716C]" />
            <span>Intern Status</span>
          </Link>
          <Link
            href="/staff/daily-log"
            id="staff-daily-log-btn"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F6B5D] hover:bg-[#0B554A] text-white text-xs font-medium"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Daily Log</span>
          </Link>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          id="staff-tasks-status-banner"
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

      {/* Active Assigned Tasks List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1A1917] flex items-center gap-2">
            <span>Assigned Projects</span>
            <span className="px-2 py-0.5 rounded bg-[#EFECE4] border border-[#E4DFD3] text-[#57534E] text-xs font-medium tabular-nums">
              {tasks.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#78716C] bg-white border border-[#E4DFD3] rounded-lg">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0F6B5D] mb-2" />
            <span>টাস্ক লোড হচ্ছে...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#78716C] bg-white border border-[#E4DFD3] rounded-lg">
            বর্তমানে আপনার কোনো নির্ধারিত শুটিং বা এডিটিং টাস্ক নেই।
          </div>
        ) : (
          <div className="space-y-3" id="staff-tasks-list">
            {tasks.map((task) => {
              const isProjectLead = currentUser?.id === task.lead_staff_id;
              const isCompleted = task.stage === "completed";

              return (
                <div
                  key={task.id}
                  id={`staff-task-card-${task.id}`}
                  className="bg-white border border-[#E4DFD3] rounded-lg shadow-[0_1px_2px_rgba(26,25,23,0.04)] p-4 sm:p-5 space-y-4"
                >
                  {/* Top Bar: Course, Status Badge, Countdown */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4DFD3] pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Monochrome Stage Badge */}
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] text-[11px] font-medium">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            task.stage === "completed" ? "bg-[#0F6B5D]" : "bg-[#78716C]"
                          }`}
                        />
                        {TASK_STAGE_LABELS[task.stage]?.en} ({TASK_STAGE_LABELS[task.stage]?.bn})
                      </span>

                      {/* Lead Badge */}
                      {isProjectLead ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] text-[11px] font-medium" id={`lead-badge-${task.id}`}>
                          <Crown className="w-3 h-3 text-[#0F6B5D]" />
                          <span>Project Lead</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#78716C]">
                          Team Member (Lead: {task.lead_name})
                        </span>
                      )}

                      <h3 className="text-sm font-semibold text-[#1A1917]">
                        {task.course_name}
                      </h3>
                    </div>

                    {/* Deadline Countdown */}
                    {!isCompleted && task.deadline_at && (
                      <span
                        className={`text-xs font-medium flex items-center gap-1 tabular-nums ${
                          task.is_overdue ? "text-red-600 font-semibold" : "text-[#57534E]"
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
                      <span className="text-[#78716C] block text-[11px]">Format &amp; Ratio</span>
                      <span className="font-medium text-[#1A1917]">
                        {task.format_duration} ({task.framing_type})
                      </span>
                    </div>

                    <div>
                      <span className="text-[#78716C] block text-[11px]">Venue &amp; Call Time</span>
                      <span className="font-medium text-[#1A1917] flex items-center gap-1 tabular-nums">
                        <MapPin className="w-3 h-3 text-[#78716C]" />
                        <span>{task.venue_name} • {task.call_time}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[#78716C] block text-[11px]">Raw Footage</span>
                      {task.raw_footage_uploaded ? (
                        <span className="font-medium text-[#0F6B5D] flex items-center gap-1" id={`footage-status-${task.id}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Uploaded</span>
                        </span>
                      ) : (
                        <span className="font-medium text-[#78716C] flex items-center gap-1" id={`footage-status-${task.id}`}>
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[#78716C] block text-[11px]">Assigned Gear</span>
                      <span className="font-medium text-[#1A1917] flex items-center gap-1 truncate" title={task.gear_summary}>
                        <Camera className="w-3 h-3 text-[#78716C] shrink-0" />
                        <span className="truncate">{task.gear_summary}</span>
                      </span>
                    </div>
                  </div>

                  {/* Team Members Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                    <span className="text-[#78716C] text-[11px] mr-1">Team:</span>
                    {task.assignees.map((m) => (
                      <span
                        key={m.user_id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] text-[11px] font-medium"
                      >
                        <span>{m.full_name}</span>
                        {m.assignment_role === "lead" && <Crown className="w-2.5 h-2.5 text-[#0F6B5D]" />}
                        <span className="text-[#78716C] tabular-nums">({m.phone})</span>
                      </span>
                    ))}
                  </div>

                  {/* Google Drive Link if Attached */}
                  {task.final_drive_url && (
                    <div className="p-2.5 rounded-lg bg-[#F7F5F0] border border-[#E4DFD3] flex items-center justify-between text-xs">
                      <span className="text-[#1A1917] font-medium flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-[#0F6B5D]" />
                        <span>Google Drive delivery link attached</span>
                      </span>
                      <a
                        href={task.final_drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#0F6B5D] hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <span>Open Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-[#E4DFD3] flex flex-wrap items-center justify-between gap-2.5">
                    <button
                      onClick={() => handleOpenSlip(task.id)}
                      id={`staff-view-slip-btn-${task.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4DFD3] bg-white hover:bg-[#EFECE4] text-[#1A1917] text-xs font-medium cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#78716C]" />
                      <span>Shoot Slip &amp; WhatsApp</span>
                    </button>

                    {/* Staff Project Lead Controls (Enforced by RLS tasks_lead_staff_update) */}
                    {isProjectLead ? (
                      <div className="flex flex-wrap items-center gap-2 ml-auto" id={`lead-controls-${task.id}`}>
                        {task.stage === "shoot_assigned" && (
                          <button
                            onClick={() => handleStageChange(task.id, "shoot_done")}
                            disabled={updatingTaskId === task.id}
                            id={`mark-shoot-done-btn-${task.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0F6B5D] hover:bg-[#0B554A] text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0F6B5D] hover:bg-[#0B554A] text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0F6B5D] hover:bg-[#0B554A] text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E4DFD3] bg-white hover:bg-[#EFECE4] text-[#1A1917] text-xs font-medium cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5 text-[#78716C]" />
                          <span>{task.final_drive_url ? "ড্রাইভ লিংক এডিট" : "ড্রাইভ লিংক সংযুক্ত করুন"}</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#78716C] ml-auto">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1917]/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingDriveTaskId(null);
          }}
        >
          <div className="w-full max-w-md bg-white rounded-lg shadow-[0_4px_24px_rgba(26,25,23,0.08)] border border-[#E4DFD3] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4DFD3] pb-3">
              <h3 className="text-sm font-semibold text-[#1A1917] flex items-center gap-2">
                <Video className="w-4 h-4 text-[#0F6B5D]" />
                <span>ফাইনাল গুগল ড্রাইভ ডেলিভারি URL সংযুক্ত করুন</span>
              </h3>
              <button
                onClick={() => setEditingDriveTaskId(null)}
                className="text-[#78716C] hover:text-[#1A1917] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {driveUrlError && (
              <div
                id="staff-drive-error-banner"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{driveUrlError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#57534E]">
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
                className="w-full px-3 py-2 rounded-lg border border-[#E4DFD3] text-xs sm:text-sm focus:outline-none focus:border-[#0F6B5D]"
                required
              />
              <p className="text-[11px] text-[#78716C]">
                (PostgreSQL CHECK: final_drive_url ~* &apos;^https://(drive|docs)\.google\.com/&apos;)
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDriveTaskId(null)}
                className="px-3.5 py-2 rounded-lg border border-[#E4DFD3] text-xs font-medium text-[#57534E] hover:bg-[#EFECE4] cursor-pointer"
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
                className="px-4 py-2 rounded-lg bg-[#0F6B5D] hover:bg-[#0B554A] text-white text-xs font-medium cursor-pointer"
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
