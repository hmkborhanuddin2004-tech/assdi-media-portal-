"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Kanban,
  Search,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  FileText,
  AlertCircle,
  Video,
  Check,
  Loader2,
  X,
} from "lucide-react";
import type { TaskStage } from "@/lib/types/database";
import type { EnrichedTask, ShootSlipData } from "@/lib/tasks/store";
import { TASK_STAGES, GOOGLE_DRIVE_URL_REGEX } from "@/lib/validations/tasks";
import { ShootAssignmentSlipModal } from "@/components/tasks/ShootAssignmentSlipModal";
import { ApproveAndAssignModal } from "@/components/tasks/ApproveAndAssignModal";
import type { RequisitionItem } from "@/lib/requisitions/store";

const STAGE_CONFIG: Record<
  TaskStage,
  {
    title: string;
    colorPill: string;
    borderAccent: string;
    bgHeader: string;
  }
> = {
  pending: {
    title: "Pending",
    colorPill: "bg-amber-400",
    borderAccent: "border-amber-400/40",
    bgHeader: "bg-amber-50/50",
  },
  shoot_assigned: {
    title: "Shoot Assigned",
    colorPill: "bg-blue-500",
    borderAccent: "border-blue-500/40",
    bgHeader: "bg-blue-50/50",
  },
  shoot_done: {
    title: "Shoot Done",
    colorPill: "bg-sky-400",
    borderAccent: "border-sky-400/40",
    bgHeader: "bg-sky-50/50",
  },
  editing: {
    title: "Editing",
    colorPill: "bg-emerald-500",
    borderAccent: "border-emerald-500/40",
    bgHeader: "bg-emerald-50/50",
  },
  review: {
    title: "Review",
    colorPill: "bg-purple-500",
    borderAccent: "border-purple-500/40",
    bgHeader: "bg-purple-50/50",
  },
  completed: {
    title: "Completed",
    colorPill: "bg-[#0F766E]",
    borderAccent: "border-[#0F766E]/40",
    bgHeader: "bg-teal-50/50",
  },
};

export default function AdminTasksKanbanPage() {
  const [tasks, setTasks] = useState<EnrichedTask[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMobileStage, setSelectedMobileStage] = useState<TaskStage | "all">("all");

  // Shoot Slip Modal state
  const [activeSlip, setActiveSlip] = useState<ShootSlipData | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  // Approve & Assign Modal state for pending cards
  const [approvingRequisition, setApprovingRequisition] = useState<RequisitionItem | null>(null);

  // Drive URL Dialog for transitioning to Completed
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [driveUrlError, setDriveUrlError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        if (data.tasks) {
          setTasks(data.tasks);
        }
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Stage transition handler
  const handleStageTransition = async (
    taskId: string,
    targetStage: TaskStage,
    driveUrl?: string
  ) => {
    if (targetStage === "completed" && !driveUrl) {
      const task = tasks.find((t) => t.id === taskId);
      setDriveUrlInput(task?.final_drive_url || "");
      setDriveUrlError(null);
      setCompletingTaskId(taskId);
      return;
    }

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
        alert(data.error || "স্টেজ পরিবর্তন করা সম্ভব হয়নি।");
        return;
      }

      setCompletingTaskId(null);
      setDriveUrlInput("");
      fetchTasks();
    } catch (err) {
      console.error("Failed to update task stage:", err);
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
      console.error("Failed to fetch shoot slip:", err);
    }
  };

  const handleOpenApproveModal = async (task: EnrichedTask) => {
    try {
      const res = await fetch(`/api/requisitions`);
      if (res.ok) {
        const data = await res.json();
        const req = data.requisitions?.find((r: RequisitionItem) => r.id === task.requisition_id);
        if (req) {
          setApprovingRequisition(req);
        } else {
          // Construct fallback requisition from enriched task
          setApprovingRequisition({
            id: task.requisition_id,
            course_id: "c1000000-0000-0000-0000-000000000005",
            course_name: task.course_name,
            course_code: task.course_code,
            coordinator_id: "00000000-0000-0000-0000-000000000001",
            coordinator_name: task.coordinator_name,
            program_type: "visitor_reel",
            format_duration: task.format_duration,
            framing_type: "vertical_9_16",
            venue_id: "ba000000-0000-0000-0000-000000000003",
            venue_name: task.venue_name,
            shoot_date: task.shoot_date,
            call_time: task.call_time,
            coordinator_phone: task.coordinator_phone,
            notes: task.notes,
            is_emergency_override: false,
            override_reason: null,
            status: "pending",
            rejection_reason: null,
            reviewed_by: null,
            reviewed_at: null,
            created_at: task.created_at,
            updated_at: task.updated_at,
          });
        }
      }
    } catch (err) {
      console.error("Failed to open approve modal:", err);
    }
  };

  // Filter tasks by search query
  const filteredTasks = tasks.filter((task) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const courseMatch = task.course_name.toLowerCase().includes(q);
    const leadMatch = task.lead_name.toLowerCase().includes(q);
    const assigneeMatch = task.assignees.some((a) => a.full_name.toLowerCase().includes(q));
    const gearMatch = task.gear_summary.toLowerCase().includes(q);
    return courseMatch || leadMatch || assigneeMatch || gearMatch;
  });

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header Bar matching docs/mockups/task-board.jpg */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-100 text-[#0F766E]">
              <Kanban className="w-5 h-5" />
            </span>
            <span>Central Task Board — 6-Stage Pipeline</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            শুটিং রিকুইজিশন অনুমোদন থেকে চূড়ান্ত ডেলিভারি পর্যন্ত ৬-ধাপের
            কেনবান পাইপলাইন।
          </p>
        </div>

        {/* Global Search Box matching mockup */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="task-board-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requisitions, gear, staff..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200/80 bg-white/90 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] shadow-2xs"
          />
        </div>
      </div>

      {/* Mobile Stage Selector Tabs (Hidden on Desktop) */}
      <div className="flex sm:hidden overflow-x-auto pb-2 gap-1.5 no-scrollbar">
        <button
          onClick={() => setSelectedMobileStage("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
            selectedMobileStage === "all"
              ? "bg-[#0F766E] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600"
          }`}
        >
          All Stages ({tasks.length})
        </button>
        {TASK_STAGES.map((stg) => {
          const count = filteredTasks.filter((t) => t.stage === stg).length;
          const conf = STAGE_CONFIG[stg];
          return (
            <button
              key={stg}
              onClick={() => setSelectedMobileStage(stg)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedMobileStage === stg
                  ? "bg-[#0F766E] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${conf.colorPill}`} />
              <span>
                {conf.title} ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* 6-Column Kanban Board matching docs/mockups/task-board.jpg */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 glass-panel rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
          <span>টাস্ক বোর্ড লোড হচ্ছে...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 items-start overflow-x-auto pb-4">
          {TASK_STAGES.map((stageKey) => {
            // Mobile filtering visibility check
            if (selectedMobileStage !== "all" && selectedMobileStage !== stageKey) {
              return null;
            }

            const columnConfig = STAGE_CONFIG[stageKey];
            const columnTasks = filteredTasks.filter((t) => t.stage === stageKey);

            return (
              <div
                key={stageKey}
                id={`kanban-column-${stageKey}`}
                className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-3 flex flex-col min-h-[480px] shadow-2xs"
              >
                {/* Column Top Accent & Header matching mockup */}
                <div className="space-y-2 mb-3">
                  <div
                    className={`h-1.5 w-12 rounded-full ${columnConfig.colorPill}`}
                  />
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                      {columnConfig.title} ({columnTasks.length})
                    </h2>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] pr-0.5">
                  {columnTasks.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      কোনো টাস্ক নেই
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const isPending = task.stage === "pending";
                      const isEditing = task.stage === "editing";
                      const isReview = task.stage === "review";
                      const isCompleted = task.stage === "completed";

                      const stageIdx = TASK_STAGES.indexOf(task.stage);
                      const prevStage = stageIdx > 0 ? TASK_STAGES[stageIdx - 1] : null;
                      const nextStage = stageIdx < TASK_STAGES.length - 1 ? TASK_STAGES[stageIdx + 1] : null;

                      // Display team names matching mockup: Arif, Hasan or Editor: Nabil
                      const teamNames = task.assignees
                        .map((a) => a.full_name.split(" ")[0])
                        .join(", ");

                      return (
                        <div
                          key={task.id}
                          id={`task-card-${task.id}`}
                          className="glass-panel p-3.5 rounded-xl border border-slate-200/90 bg-white/95 shadow-2xs hover:shadow-xs hover:border-[#0F766E]/40 transition-all space-y-2.5 text-xs"
                        >
                          {/* Title & Format */}
                          <div>
                            <h3 className="font-bold text-slate-900 leading-snug">
                              {task.course_name}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {task.format_duration} • {task.shoot_date}
                            </p>
                          </div>

                          {/* Card Sub-Lines Matching Mockup */}
                          <div className="space-y-1 text-[11px] text-slate-600">
                            {/* Team Assignment Line */}
                            {task.assignees.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">•</span>
                                <span className="font-semibold text-slate-700">
                                  {isEditing
                                    ? `Editor: ${teamNames || task.lead_name}`
                                    : `Team: ${teamNames || task.lead_name}`}
                                </span>
                              </div>
                            )}

                            {/* Raw Footage Uploaded Indicator */}
                            {task.raw_footage_uploaded && (
                              <div className="flex items-center gap-1 text-emerald-600 font-bold">
                                <span className="text-slate-400">•</span>
                                <span className="flex items-center gap-1">
                                  <span>Raw Uploaded</span>
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                              </div>
                            )}

                            {/* Review Indicator */}
                            {isReview && (
                              <div className="flex items-center gap-1 text-purple-700 font-semibold">
                                <span className="text-slate-400">•</span>
                                <span>Lead Review</span>
                              </div>
                            )}

                            {/* Delivered Indicator */}
                            {isCompleted && (
                              <div className="flex items-center gap-1 text-emerald-700 font-bold">
                                <span className="text-slate-400">•</span>
                                <span>Delivered ✓</span>
                              </div>
                            )}

                            {/* Deadline Countdown */}
                            {!isCompleted && task.deadline_at && (
                              <div
                                className={`flex items-center gap-1 font-semibold ${
                                  task.is_overdue
                                    ? "text-rose-600"
                                    : "text-slate-600"
                                }`}
                              >
                                <span className="text-slate-400">•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{task.countdown_label}</span>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Google Drive Link Button for Completed Cards matching mockup */}
                          {isCompleted && task.final_drive_url && (
                            <a
                              href={task.final_drive_url}
                              target="_blank"
                              rel="noreferrer"
                              id={`drive-link-btn-${task.id}`}
                              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-[11px] font-bold shadow-2xs transition-all"
                            >
                              <span>Google Drive Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}

                          {/* Action Buttons: Shoot Slip & Stage Transitions */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                            {/* Shoot Slip Button */}
                            {!isPending && (
                              <button
                                onClick={() => handleOpenSlip(task.id)}
                                id={`slip-btn-${task.id}`}
                                className="text-[10px] font-semibold text-[#0F766E] hover:underline flex items-center gap-1 p-1"
                                title="View Shoot Assignment Slip"
                              >
                                <FileText className="w-3 h-3" />
                                <span>স্লিপ</span>
                              </button>
                            )}

                            {/* Approve & Assign Button for Pending Card */}
                            {isPending && (
                              <button
                                onClick={() => handleOpenApproveModal(task)}
                                id={`pending-approve-btn-${task.id}`}
                                className="w-full py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-[11px] font-bold shadow-2xs transition-all flex items-center justify-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve & Assign</span>
                              </button>
                            )}

                            {/* Stage Step Controls */}
                            {!isPending && (
                              <div className="flex items-center gap-1 ml-auto">
                                {prevStage && (
                                  <button
                                    onClick={() => handleStageTransition(task.id, prevStage)}
                                    disabled={updatingTaskId === task.id}
                                    title={`Move to ${STAGE_CONFIG[prevStage].title}`}
                                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                  >
                                    <ChevronLeft className="w-3 h-3" />
                                  </button>
                                )}
                                {nextStage && (
                                  <button
                                    onClick={() => handleStageTransition(task.id, nextStage)}
                                    disabled={updatingTaskId === task.id}
                                    id={`next-stage-btn-${task.id}`}
                                    title={`Move to ${STAGE_CONFIG[nextStage].title}`}
                                    className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-[#0F766E] font-bold text-[10px] flex items-center gap-0.5 transition-colors"
                                  >
                                    <span>{STAGE_CONFIG[nextStage].title}</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Google Drive URL Input Modal for Completed Stage */}
      {completingTaskId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCompletingTaskId(null);
          }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-[#0F766E]" />
                <span>টাস্ক সম্পন্ন ও ডেলিভারি লিংক</span>
              </h3>
              <button
                onClick={() => setCompletingTaskId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {driveUrlError && (
              <div
                id="drive-url-error-banner"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{driveUrlError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                গুগল ড্রাইভ ডেলিভারি URL (Mandatory)*
              </label>
              <input
                type="url"
                id="final-drive-url-input"
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
                লিংকটি অবশ্যই `https://drive.google.com/` অথবা `https://docs.google.com/` দিয়ে শুরু হতে হবে।
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompletingTaskId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                বাতিল
              </button>
              <button
                type="button"
                id="confirm-complete-task-btn"
                onClick={() => {
                  if (!driveUrlInput || !GOOGLE_DRIVE_URL_REGEX.test(driveUrlInput)) {
                    setDriveUrlError(
                      'গুগল ড্রাইভ লিংক অবশ্যই "https://drive.google.com/" বা "https://docs.google.com/" দিয়ে শুরু হতে হবে। (chk_completed_drive_url)'
                    );
                    return;
                  }
                  handleStageTransition(completingTaskId, "completed", driveUrlInput);
                }}
                className="px-5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-xs"
              >
                টাস্ক সম্পন্ন করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shoot Assignment Slip Modal */}
      <ShootAssignmentSlipModal
        key={activeSlip ? activeSlip.slip_number : "slip-closed"}
        slip={activeSlip}
        isOpen={showSlipModal}
        onClose={() => setShowSlipModal(false)}
      />

      {/* Approve & Assign Modal for Pending Card */}
      <ApproveAndAssignModal
        key={approvingRequisition ? approvingRequisition.id : "modal-closed"}
        requisition={approvingRequisition}
        isOpen={Boolean(approvingRequisition)}
        onClose={() => setApprovingRequisition(null)}
        onSuccess={(_task, slip) => {
          setActiveSlip(slip);
          setShowSlipModal(true);
          fetchTasks();
        }}
      />
    </div>
  );
}
