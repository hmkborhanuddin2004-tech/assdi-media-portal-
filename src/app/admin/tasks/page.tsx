"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
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
import { motion } from "framer-motion";
import { MODAL_TRANSITION } from "@/lib/motion";
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
    dotColor: string;
  }
> = {
  pending: {
    title: "Pending",
    dotColor: "bg-[#A1A1AA]",
  },
  shoot_assigned: {
    title: "Shoot Assigned",
    dotColor: "bg-[#71717A]",
  },
  shoot_done: {
    title: "Shoot Done",
    dotColor: "bg-[#52525B]",
  },
  editing: {
    title: "Editing",
    dotColor: "bg-[#3F3F46]",
  },
  review: {
    title: "Review",
    dotColor: "bg-[#09090B]",
  },
  completed: {
    title: "Completed",
    dotColor: "bg-[#0F766E]",
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
    <div className="space-y-5 w-full max-w-full overflow-x-hidden">
      {/* Flat Linear/Stripe Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E4E4E7]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#09090B] tracking-tight">
          Task Board
        </h1>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="task-board-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses, gear, staff..."
            className="w-full h-8 pl-8 pr-3 rounded-md border border-[#E4E4E7] bg-white text-xs text-[#09090B] placeholder:text-[#71717A] focus:outline-none focus:border-[#0F766E]"
          />
        </div>
      </div>

      {/* Mobile Stage Selector Tabs (Hidden on Desktop) */}
      <div className="flex sm:hidden overflow-x-auto pb-1 gap-1.5 no-scrollbar">
        <button
          onClick={() => setSelectedMobileStage("all")}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium shrink-0 ${
            selectedMobileStage === "all"
              ? "bg-[#09090B] text-white"
              : "bg-white border border-[#E4E4E7] text-[#52525B]"
          }`}
        >
          All ({tasks.length})
        </button>
        {TASK_STAGES.map((stg) => {
          const count = filteredTasks.filter((t) => t.stage === stg).length;
          const conf = STAGE_CONFIG[stg];
          return (
            <button
              key={stg}
              onClick={() => setSelectedMobileStage(stg)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium shrink-0 flex items-center gap-1.5 tabular-nums ${
                selectedMobileStage === stg
                  ? "bg-[#09090B] text-white"
                  : "bg-white border border-[#E4E4E7] text-[#52525B]"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${conf.dotColor}`} />
              <span>
                {conf.title} ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* 6-Column Kanban Board */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#71717A] bg-white border border-[#E4E4E7] rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0F766E] mb-2" />
          <span>Loading task board...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-start overflow-x-auto pb-4">
          {TASK_STAGES.map((stageKey) => {
            if (selectedMobileStage !== "all" && selectedMobileStage !== stageKey) {
              return null;
            }

            const columnConfig = STAGE_CONFIG[stageKey];
            const columnTasks = filteredTasks.filter((t) => t.stage === stageKey);

            return (
              <div
                key={stageKey}
                id={`kanban-column-${stageKey}`}
                className="bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg p-2.5 flex flex-col min-h-[480px]"
              >
                <div className="flex items-center justify-between px-1 pb-2.5 mb-2 border-b border-[#E4E4E7]">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${columnConfig.dotColor}`} />
                    <h2 className="text-xs font-semibold text-[#09090B]">
                      {columnConfig.title}
                    </h2>
                  </div>
                  <span className="text-[11px] font-medium text-[#71717A] tabular-nums">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto max-h-[70vh]">
                  {columnTasks.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-[#71717A] border border-dashed border-[#D4D4D8] rounded-md">
                      Empty
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const isPending = task.stage === "pending";
                      const isEditing = task.stage === "editing";
                      const isReview = task.stage === "review";
                      const isCompleted = task.stage === "completed";

                      const stageIdx = TASK_STAGES.indexOf(task.stage);
                      const prevStage = stageIdx > 0 ? TASK_STAGES[stageIdx - 1] : null;
                      const nextStage =
                        stageIdx < TASK_STAGES.length - 1 ? TASK_STAGES[stageIdx + 1] : null;

                      const teamNames = task.assignees
                        .map((a) => a.full_name.split(" ")[0])
                        .join(", ");

                      return (
                        <div
                          key={task.id}
                          id={`task-card-${task.id}`}
                          className="bg-white border border-[#E4E4E7] hover:border-[#D4D4D8] rounded-lg p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-2 text-xs"
                        >
                          <div>
                            <h3 className="font-medium text-[#09090B] leading-snug">
                              {task.course_name}
                            </h3>
                            <p className="text-[11px] text-[#71717A] tabular-nums mt-0.5">
                              {task.format_duration} • {task.shoot_date}
                            </p>
                          </div>

                          <div className="space-y-1 text-[11px] text-[#52525B]">
                            {task.assignees.length > 0 && (
                              <div className="truncate">
                                {isEditing
                                  ? `Editor: ${teamNames || task.lead_name}`
                                  : `Team: ${teamNames || task.lead_name}`}
                              </div>
                            )}

                            {task.raw_footage_uploaded && (
                              <div className="flex items-center gap-1 text-[#0F766E] font-medium">
                                <Check className="w-3 h-3" />
                                <span>Raw Uploaded</span>
                              </div>
                            )}

                            {isReview && (
                              <div className="text-[#09090B] font-medium">Lead Review</div>
                            )}

                            {isCompleted && (
                              <div className="text-[#0F766E] font-medium">Delivered</div>
                            )}

                            {!isCompleted && task.deadline_at && (
                              <div
                                className={`flex items-center gap-1 tabular-nums ${
                                  task.is_overdue ? "text-[#DC2626] font-medium" : "text-[#71717A]"
                                }`}
                              >
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>{task.countdown_label}</span>
                              </div>
                            )}
                          </div>

                          {isCompleted && task.final_drive_url && (
                            <a
                              href={task.final_drive_url}
                              target="_blank"
                              rel="noreferrer"
                              id={`drive-link-btn-${task.id}`}
                              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-[#0F766E] hover:bg-[#0D645D] text-white text-[11px] font-medium"
                            >
                              <span>Google Drive Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}

                          <div className="pt-2 border-t border-[#E4E4E7] flex items-center justify-between gap-1">
                            {!isPending && (
                              <button
                                onClick={() => handleOpenSlip(task.id)}
                                id={`slip-btn-${task.id}`}
                                className="text-[11px] font-medium text-[#52525B] hover:text-[#0F766E] flex items-center gap-1 py-0.5"
                                title="View Shoot Assignment Slip"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Slip</span>
                              </button>
                            )}

                            {isPending && (
                              <button
                                onClick={() => handleOpenApproveModal(task)}
                                id={`pending-approve-btn-${task.id}`}
                                className="w-full py-1.5 rounded-md bg-[#0F766E] hover:bg-[#0D645D] text-white text-[11px] font-medium flex items-center justify-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve &amp; Assign</span>
                              </button>
                            )}

                            {!isPending && (
                              <div className="flex items-center gap-1 ml-auto">
                                {prevStage && (
                                  <button
                                    onClick={() => handleStageTransition(task.id, prevStage)}
                                    disabled={updatingTaskId === task.id}
                                    title={`Move to ${STAGE_CONFIG[prevStage].title}`}
                                    className="p-1 rounded bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#52525B] border border-[#E4E4E7]"
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
                                    className="px-2 py-0.5 rounded bg-white hover:bg-[#F4F4F5] text-[#09090B] border border-[#E4E4E7] font-medium text-[10.5px] flex items-center gap-0.5"
                                  >
                                    <span>{STAGE_CONFIG[nextStage].title}</span>
                                    <ChevronRight className="w-3 h-3 text-[#71717A]" />
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090B]/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCompletingTaskId(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={MODAL_TRANSITION}
            className="w-full max-w-md bg-white rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-[#E4E4E7] p-5 space-y-4"
          >
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
          </motion.div>
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
