"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Kanban,
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
    <div className="space-y-4 w-full max-w-xl mx-auto pb-8">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-emerald-600/20 bg-white/90 shadow-2xs space-y-1">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
            <Kanban className="w-3.5 h-3.5" />
            <span>ইন্টার্ন টাস্ক ও অ্যাসাইনমেন্ট</span>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            {currentUser?.full_name || "Intern"}
          </span>
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          Assigned Tasks &amp; Project Status
        </h1>
        <p className="text-xs text-slate-500">
          আপনার অংশগ্রহণে চলমান ও সম্পন্ন প্রজেক্টের তালিকা এবং স্ট্যাটাস।
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 glass-panel rounded-2xl bg-white">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0F766E]" />
          <span>টাস্ক লোড হচ্ছে...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80">
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
                className="glass-panel p-4 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-slate-400 block">
                      {task.course_code}
                    </span>
                    <h2 className="text-sm font-bold text-slate-900 leading-tight">
                      {task.course_name}
                    </h2>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                      task.stage === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : task.stage === "review"
                        ? "bg-purple-100 text-purple-800"
                        : task.stage === "editing"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {stageLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block">টিম লিড:</span>
                    <span className="font-bold text-slate-800">{task.lead_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ভেন্যু:</span>
                    <span className="font-semibold text-slate-700">
                      {task.venue_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ডেডলাইন:</span>
                    <span
                      className={`font-semibold ${
                        task.is_overdue ? "text-rose-600 font-bold" : "text-slate-700"
                      }`}
                    >
                      {task.countdown_label}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">র-ফুটেজ:</span>
                    <span
                      className={`font-bold ${
                        task.raw_footage_uploaded
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {task.raw_footage_uploaded ? "Uploaded ✓" : "Pending"}
                    </span>
                  </div>
                </div>

                {task.final_drive_url && (
                  <div className="pt-1">
                    <a
                      href={task.final_drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>গুগল ড্রাইভ ফাইনাল ডেলিভারি লিংক</span>
                    </a>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    অ্যাসাইন করা সদস্য: {task.assignees.length} জন
                  </span>
                  <Link
                    href={`/intern/daily-log`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0F766E] hover:underline"
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
