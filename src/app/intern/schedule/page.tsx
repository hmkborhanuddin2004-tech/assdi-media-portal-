"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { UserProfile } from "@/lib/types/auth";
import type { EnrichedTask } from "@/lib/tasks/store";

export default function InternSchedulePage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [assignedTasks, setAssignedTasks] = useState<EnrichedTask[]>([]);
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
          setAssignedTasks(tasksData.tasks);
        }
      }
    } catch (err) {
      console.error("Failed to load intern schedule:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Today's shoot is the first upcoming shoot
  const todayShoot = assignedTasks.find(
    (t) => t.stage === "shoot_assigned" || t.stage === "shoot_done"
  ) || assignedTasks[0];

  const upcomingShoots = assignedTasks.filter((t) => t.id !== todayShoot?.id);

  return (
    <div className="space-y-4 w-full max-w-xl mx-auto pb-8">
      {/* Top Banner */}
      <div className="glass-panel p-4 sm:p-5 space-y-1">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0f766e]/15 text-[#0b5a54] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ইন্টার্ন শুটিং শিডিউল</span>
          </div>
          <span className="text-[11px] font-bold text-[#33475f]">
            {currentUser?.full_name || "Intern"}
          </span>
        </div>
        <h1 className="text-lg sm:text-xl font-extrabold text-[#0b1f3a] tracking-tight">
          Today&apos;s &amp; Upcoming Assigned Shoots
        </h1>
        <p className="text-xs text-[#33475f] font-medium">
          আপনার নির্ধারিত শুটিং টিম, কল টাইম এবং ভেন্যু বিস্তারিত দেখুন।
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#33475f] font-medium glass-panel">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0F766E]" />
          <span>শিডিউল লোড হচ্ছে...</span>
        </div>
      ) : (
        <>
          {/* Today's Shoot Card matching mockup */}
          {todayShoot ? (
            <div
              id="intern-schedule-today-card"
              className="glass-emerald-card rounded-[18px] p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#0b5a54] uppercase tracking-wider">
                  Today&apos;s Shoot
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#0F766E] text-white text-[11px] font-bold shadow-2xs">
                  {todayShoot.stage.replace("_", " ").toUpperCase()}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {todayShoot.course_name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
                  <div className="flex items-center gap-1 font-semibold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>কল টাইম: {todayShoot.call_time || "09:00 AM"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>{todayShoot.venue_name || "50 Katha Campus"}</span>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="pt-2 border-t border-emerald-600/15 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>টিম মেম্বার ও লিড:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold">
                    ★ {todayShoot.lead_name} (Lead)
                  </span>
                  {todayShoot.assignees
                    .filter((a) => a.assignment_role !== "lead")
                    .map((a) => (
                      <span
                        key={a.user_id}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold"
                      >
                        {a.full_name}
                      </span>
                    ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link
                  href="/intern/daily-log"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>এই শুটিংয়ের জন্য ডেইলি লগ সাবমিট করুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              আজকের কোনো নির্ধারিত শুটিং নেই।
            </div>
          )}

          {/* Upcoming Shoots List */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>আসন্ন শুটিং ও অ্যাসাইনমেন্ট ({upcomingShoots.length})</span>
            </h3>

            {upcomingShoots.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200/80">
                অন্য কোনো অ্যাসাইনমেন্ট নেই।
              </div>
            ) : (
              <div className="space-y-2.5" id="intern-upcoming-shoots-list">
                {upcomingShoots.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {task.course_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {task.stage.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#0F766E]" />
                        <span>{task.call_time || "10:00 AM"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#0F766E]" />
                        <span>{task.venue_name || "Campus"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>টিম লিড: {task.lead_name}</span>
                      <span
                        className={
                          task.raw_footage_uploaded
                            ? "text-emerald-700 font-bold"
                            : "text-slate-400"
                        }
                      >
                        {task.raw_footage_uploaded ? "Raw Uploaded ✓" : "Pending Raw"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
