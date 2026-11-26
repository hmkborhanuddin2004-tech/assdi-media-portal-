"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  ArrowLeft,
  Phone,
  Check,
  Loader2,
} from "lucide-react";
import type { EnrichedTask } from "@/lib/tasks/store";
import type { UserProfile } from "@/lib/types/auth";

export default function StaffInternStatusPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<EnrichedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
      console.error("Failed to load intern status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick toggle raw footage upload status
  const handleToggleFootage = async (taskId: string, currentStatus: boolean) => {
    setUpdatingTaskId(taskId);
    setSuccessNote(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: tasks.find((t) => t.id === taskId)?.stage,
          raw_footage_uploaded: !currentStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessNote(`র ফুটেজ আপলোড স্ট্যাটাস সফলভাবে ${!currentStatus ? "আপলোডেড" : "পেন্ডিং"} করা হয়েছে।`);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to toggle raw footage:", err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Filter tasks that have interns assigned and where current user is lead or admin
  const internTasks = tasks.filter((t) => {
    const hasIntern = t.assignees.some((a) => a.role === "intern");
    if (currentUser?.role === "admin") return hasIntern;
    return hasIntern && t.lead_staff_id === currentUser?.id;
  });

  return (
    <div className="space-y-5 w-full max-w-full">
      {/* Flat Linear/Stripe Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4DFD3]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#1A1917] tracking-tight">
          Intern Status
        </h1>

        <Link
          href="/staff/tasks"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4DFD3] bg-white hover:bg-[#EFECE4] text-[#1A1917] text-xs font-medium shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#78716C]" />
          <span>Back to My Tasks</span>
        </Link>
      </div>

      {successNote && (
        <div className="p-3 rounded-lg bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] font-medium text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#0F6B5D] shrink-0" />
          <span>{successNote}</span>
        </div>
      )}

      {/* Interns Tracking List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#1A1917] flex items-center gap-2">
          <Users className="w-4 h-4 text-[#78716C]" />
          <span>Assigned Interns &amp; Raw Footage Status</span>
          <span className="px-2 py-0.5 rounded bg-[#EFECE4] border border-[#E4DFD3] text-[#57534E] text-xs font-medium tabular-nums">
            {internTasks.length}
          </span>
        </h2>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#78716C] bg-white border border-[#E4DFD3] rounded-lg">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0F6B5D] mb-2" />
            <span>ইন্টার্ন ট্র্যাকিং তথ্য লোড হচ্ছে...</span>
          </div>
        ) : internTasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#78716C] bg-white border border-[#E4DFD3] rounded-lg">
            বর্তমানে আপনার কোনো টাস্কে ইন্টার্ন সদস্য যুক্ত নেই।
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {internTasks.map((task) => {
              const interns = task.assignees.filter((a) => a.role === "intern");

              return (
                <div
                  key={task.id}
                  id={`intern-status-card-${task.id}`}
                  className="bg-white border border-[#E4DFD3] rounded-lg shadow-[0_1px_2px_rgba(26,25,23,0.04)] p-4 sm:p-5 space-y-3.5"
                >
                  {/* Task Header */}
                  <div className="flex items-center justify-between border-b border-[#E4DFD3] pb-2.5">
                    <div>
                      <h3 className="font-semibold text-[#1A1917] text-sm">
                        {task.course_name}
                      </h3>
                      <p className="text-[11px] text-[#78716C] tabular-nums">
                        {task.venue_name} • {task.call_time}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] text-[10px] font-medium">
                        {task.stage}
                      </span>
                    </div>
                  </div>

                  {/* Interns List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-medium text-[#78716C] block">
                      অ্যাসাইন করা ইন্টার্ন সদস্য:
                    </span>
                    {interns.map((intern) => (
                      <div
                        key={intern.user_id}
                        className="p-2.5 rounded-lg bg-[#F7F5F0] border border-[#E4DFD3] flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-medium text-[#1A1917]">
                            <span>{intern.full_name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#EFECE4] border border-[#E4DFD3] text-[10px] text-[#57534E]">
                              Intern
                            </span>
                          </div>
                          <span className="text-[11px] text-[#78716C] font-mono tabular-nums flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{intern.phone}</span>
                          </span>
                        </div>

                        {/* Raw footage status per task */}
                        <div className="text-right">
                          {task.raw_footage_uploaded ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] text-[11px] font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0F6B5D]" />
                              <span>ফুটেজ আপলোডেড</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-[#57534E] text-[11px] font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#78716C]" />
                              <span>আপলোড বাকি</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Trigger B & Lead Verification Action */}
                  <div className="pt-2 border-t border-[#E4DFD3] flex items-center justify-between">
                    <span className="text-[11px] text-[#78716C]">
                      ফুটেজ রিসিভ নিশ্চিতকরণ:
                    </span>
                    <button
                      onClick={() => handleToggleFootage(task.id, task.raw_footage_uploaded)}
                      disabled={updatingTaskId === task.id}
                      id={`toggle-footage-btn-${task.id}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                        task.raw_footage_uploaded
                          ? "bg-[#EFECE4] hover:bg-[#E4DFD3] text-[#1A1917] border border-[#E4DFD3]"
                          : "bg-[#0F6B5D] hover:bg-[#0B554A] text-white"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {task.raw_footage_uploaded
                          ? "Mark as Pending"
                          : "Verify & Mark Uploaded"}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
