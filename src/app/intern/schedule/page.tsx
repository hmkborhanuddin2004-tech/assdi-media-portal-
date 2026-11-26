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
    <div className="space-y-5 w-full max-w-xl mx-auto pb-8">
      {/* Flat Linear/Stripe Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E4DFD3]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#1A1917] tracking-tight">
          Assigned Shoots
        </h1>
        <span className="text-xs font-medium text-[#78716C]">
          {currentUser?.full_name || "Intern"}
        </span>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#78716C] bg-white border border-[#E4DFD3] rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0F6B5D]" />
          <span>শিডিউল লোড হচ্ছে...</span>
        </div>
      ) : (
        <>
          {/* Today's Shoot Card */}
          {todayShoot ? (
            <div
              id="intern-schedule-today-card"
              className="bg-white border border-[#E4DFD3] rounded-lg shadow-[0_1px_2px_rgba(26,25,23,0.04)] p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#78716C] uppercase tracking-wider">
                  Today&apos;s Shoot
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0F6B5D]" />
                  {todayShoot.stage.replace("_", " ").toUpperCase()}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-base font-semibold text-[#1A1917]">
                  {todayShoot.course_name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#57534E]">
                  <div className="flex items-center gap-1 font-medium text-[#1A1917] tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-[#78716C]" />
                    <span>কল টাইম: {todayShoot.call_time || "09:00 AM"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#57534E]">
                    <MapPin className="w-3.5 h-3.5 text-[#78716C]" />
                    <span>{todayShoot.venue_name || "50 Katha Campus"}</span>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="pt-2.5 border-t border-[#E4DFD3] space-y-1.5">
                <div className="text-[11px] font-medium text-[#78716C] flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>টিম মেম্বার ও লিড:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-1 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] text-xs font-medium">
                    ★ {todayShoot.lead_name} (Lead)
                  </span>
                  {todayShoot.assignees
                    .filter((a) => a.assignment_role !== "lead")
                    .map((a) => (
                      <span
                        key={a.user_id}
                        className="px-2 py-1 rounded-md bg-white border border-[#E4DFD3] text-[#57534E] text-xs font-medium"
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
                  className="w-full py-2.5 px-4 rounded-lg bg-[#0F6B5D] hover:bg-[#0B554A] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors duration-150"
                >
                  <FileText className="w-4 h-4" />
                  <span>এই শুটিংয়ের জন্য ডেইলি লগ সাবমিট করুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#78716C] bg-white rounded-lg border border-[#E4DFD3]">
              আজকের কোনো নির্ধারিত শুটিং নেই।
            </div>
          )}

          {/* Upcoming Shoots List */}
          <div className="space-y-2 pt-1">
            <h3 className="text-xs font-semibold text-[#1A1917] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#78716C]" />
              <span>Upcoming Assignments ({upcomingShoots.length})</span>
            </h3>

            {upcomingShoots.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#78716C] bg-white rounded-lg border border-[#E4DFD3]">
                অন্য কোনো অ্যাসাইনমেন্ট নেই।
              </div>
            ) : (
              <div className="space-y-2" id="intern-upcoming-shoots-list">
                {upcomingShoots.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-lg border border-[#E4DFD3] bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1A1917]">
                        {task.course_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-[#57534E] text-[10px] font-medium">
                        {task.stage.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#57534E] tabular-nums">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#78716C]" />
                        <span>{task.call_time || "10:00 AM"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#78716C]" />
                        <span>{task.venue_name || "Campus"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#78716C] pt-1.5 border-t border-[#E4DFD3]">
                      <span>Lead: {task.lead_name}</span>
                      <span
                        className={
                          task.raw_footage_uploaded
                            ? "text-[#0F6B5D] font-medium"
                            : "text-[#78716C]"
                        }
                      >
                        {task.raw_footage_uploaded ? "Raw Uploaded" : "Pending Raw"}
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
