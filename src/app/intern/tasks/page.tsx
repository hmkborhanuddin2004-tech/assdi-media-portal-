"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Loader2,
  FileText,
} from "lucide-react";
import type { UserProfile } from "@/lib/types/auth";
import type { EnrichedTask } from "@/lib/tasks/store";
import { TASK_STAGE_LABELS } from "@/lib/validations/tasks";

export default function InternTasksPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<EnrichedTask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [meRes, tasksRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/tasks"),
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
    } catch (err) {
      console.error("Failed to load intern tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-5 w-full max-w-xl mx-auto pb-8">
      {/* Flat Linear/Stripe Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E4DFD3]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#1A1917] tracking-tight">
          Assigned Tasks
        </h1>
        <span className="text-xs font-medium text-[#78716C]">
          {currentUser?.full_name || "Intern"}
        </span>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#78716C] bg-white border border-[#E4DFD3] rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0F6B5D]" />
          <span>টাস্ক লোড হচ্ছে...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-8 text-center text-xs text-[#78716C] bg-white border border-[#E4DFD3] rounded-lg">
          কোনো নির্ধারিত টাস্ক পাওয়া যায়নি।
        </div>
      ) : (
        <div className="space-y-3" id="intern-tasks-list">
          {tasks.map((task) => {
            const stageLabel =
              TASK_STAGE_LABELS[task.stage]?.bn || task.stage;

            return (
              <div
                key={task.id}
                className="bg-white border border-[#E4DFD3] rounded-lg shadow-[0_1px_2px_rgba(26,25,23,0.04)] p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-[#78716C] block tabular-nums">
                      {task.course_code}
                    </span>
                    <h2 className="text-sm font-semibold text-[#1A1917] leading-tight">
                      {task.course_name}
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] text-[11px] font-medium shrink-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        task.stage === "completed" ? "bg-[#0F6B5D]" : "bg-[#78716C]"
                      }`}
                    />
                    {stageLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#57534E] bg-[#F7F5F0] p-2.5 rounded-lg border border-[#E4DFD3]">
                  <div>
                    <span className="text-[#78716C] block">টিম লিড:</span>
                    <span className="font-medium text-[#1A1917]">{task.lead_name}</span>
                  </div>
                  <div>
                    <span className="text-[#78716C] block">ভেন্যু:</span>
                    <span className="font-medium text-[#1A1917]">
                      {task.venue_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#78716C] block">ডেডলাইন:</span>
                    <span
                      className={`font-medium tabular-nums ${
                        task.is_overdue ? "text-red-600 font-semibold" : "text-[#1A1917]"
                      }`}
                    >
                      {task.countdown_label}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#78716C] block">র-ফুটেজ:</span>
                    <span
                      className={`font-medium ${
                        task.raw_footage_uploaded
                          ? "text-[#0F6B5D]"
                          : "text-[#78716C]"
                      }`}
                    >
                      {task.raw_footage_uploaded ? "Uploaded" : "Pending"}
                    </span>
                  </div>
                </div>

                {task.final_drive_url && (
                  <div className="pt-1">
                    <a
                      href={task.final_drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F6B5D] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>গুগল ড্রাইভ ফাইনাল ডেলিভারি লিংক</span>
                    </a>
                  </div>
                )}

                <div className="pt-2 border-t border-[#E4DFD3] flex items-center justify-between">
                  <span className="text-[11px] text-[#78716C] tabular-nums">
                    অ্যাসাইন করা সদস্য: {task.assignees.length} জন
                  </span>
                  <Link
                    href={`/intern/daily-log`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#0F6B5D] hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>লগ লিখুন</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
