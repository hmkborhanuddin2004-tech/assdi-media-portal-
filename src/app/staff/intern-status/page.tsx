"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
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
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-5 md:p-6 border border-emerald-600/20 bg-white/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-100 text-[#0F766E] text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>টিম লিড পর্যবেক্ষণ • ইন্টার্ন ট্র্যাকিং</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
            ইন্টার্ন অ্যাক্টিভিটি ও র ফুটেজ ট্র্যাকিং
          </h1>
          <p className="text-xs text-slate-500">
            প্রজেক্ট লিড হিসেবে আপনার অ্যাসাইন করা ইন্টার্নদের শুটিং ও র ফুটেজ আপলোড স্ট্যাটাস মনিটর করুন।
          </p>
        </div>

        <Link
          href="/staff/tasks"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>টাস্ক তালিকায় ফিরে যান</span>
        </Link>
      </div>

      {successNote && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNote}</span>
        </div>
      )}

      {/* Interns Tracking List */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800">
          অ্যাসাইন করা ইন্টার্ন ও ফুটেজ রিসিভ স্ট্যাটাস ({internTasks.length})
        </h2>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 glass-panel rounded-xl">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0F766E] mb-2" />
            <span>ইন্টার্ন ট্র্যাকিং তথ্য লোড হচ্ছে...</span>
          </div>
        ) : internTasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 glass-panel rounded-xl border border-dashed border-slate-200">
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
                  className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs bg-white/95 space-y-3.5"
                >
                  {/* Task Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {task.course_name}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {task.venue_name} • {task.call_time}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                        {task.stage}
                      </span>
                    </div>
                  </div>

                  {/* Interns List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 block">
                      অ্যাসাইন করা ইন্টার্ন সদস্য:
                    </span>
                    {interns.map((intern) => (
                      <div
                        key={intern.user_id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <span>{intern.full_name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800">
                              Intern
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{intern.phone}</span>
                          </span>
                        </div>

                        {/* Raw footage status per task */}
                        <div className="text-right">
                          {task.raw_footage_uploaded ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ফুটেজ আপলোডেড</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-bold">
                              <Clock className="w-3 h-3" />
                              <span>আপলোড বাকি</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Trigger B & Lead Verification Action */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      ফুটেজ রিসিভ নিশ্চিতকরণ:
                    </span>
                    <button
                      onClick={() => handleToggleFootage(task.id, task.raw_footage_uploaded)}
                      disabled={updatingTaskId === task.id}
                      id={`toggle-footage-btn-${task.id}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs transition-all ${
                        task.raw_footage_uploaded
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          : "bg-[#0F766E] hover:bg-[#115E59] text-white"
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
