"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Phone,
  ShieldCheck,
  Clock,
  FileText,
  LogOut,
  Loader2,
} from "lucide-react";
import type { UserProfile } from "@/lib/types/auth";
import type { EnrichedDailyLog } from "@/lib/daily-logs/store";

export default function InternProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<EnrichedDailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [meRes, logsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/daily-logs?period=all&limit=50"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData.logs) {
          setLogs(logsData.logs);
        }
      }
    } catch (err) {
      console.error("Failed to load intern profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Signout failed:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const totalHours = logs.reduce((sum, l) => sum + l.hours_spent, 0);

  return (
    <div className="space-y-5 w-full max-w-xl mx-auto pb-8">
      {/* Flat Linear/Stripe Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E4E4E7]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#09090B] tracking-tight">
          Intern Member Profile
        </h1>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#71717A] bg-white border border-[#E4E4E7] rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0F766E]" />
          <span>প্রোফাইল লোড হচ্ছে...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* User Card */}
          <div className="bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-semibold text-base">
                {currentUser?.full_name?.charAt(0) || "I"}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[#09090B]">
                    {currentUser?.full_name || "Intern Member"}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#27272A] text-[10px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
                    সক্রিয়
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 text-xs text-[#71717A]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#71717A]" />
                  <span>Intern / Trainee</span>
                </div>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="space-y-2 pt-3 border-t border-[#E4E4E7] text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7]">
                <span className="text-[#71717A] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#71717A]" />
                  <span>ইমেইল এড্রেস:</span>
                </span>
                <span className="font-medium text-[#09090B]">
                  {currentUser?.email || "intern@assdi.org"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7]">
                <span className="text-[#71717A] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#71717A]" />
                  <span>মোবাইল নম্বর:</span>
                </span>
                <span className="font-medium text-[#09090B] tabular-nums">
                  {currentUser?.phone || "01711-000004"}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg border border-[#E4E4E7] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-1">
              <span className="text-[#71717A] text-xs flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#71717A]" />
                <span>Total Logs</span>
              </span>
              <div className="text-2xl font-semibold text-[#09090B] tabular-nums">
                {logs.length}
              </div>
              <span className="text-[11px] text-[#71717A] block">
                সাবমিট করা হয়েছে
              </span>
            </div>

            <div className="p-4 rounded-lg border border-[#E4E4E7] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-1">
              <span className="text-[#71717A] text-xs flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#71717A]" />
                <span>Total Hours</span>
              </span>
              <div className="text-2xl font-semibold text-[#09090B] tabular-nums">
                {Math.round(totalHours * 10) / 10} <span className="text-xs font-normal text-[#71717A]">hrs</span>
              </div>
              <span className="text-[11px] text-[#71717A] block">
                ফিল্ড ও এডিটিং সম্পন্ন
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            id="intern-signout-btn"
            onClick={handleSignOut}
            disabled={loggingOut}
            className="w-full py-2.5 px-4 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs sm:text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
