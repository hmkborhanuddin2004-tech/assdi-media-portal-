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
  Sparkles,
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
    <div className="space-y-4 w-full max-w-xl mx-auto pb-8">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-emerald-600/20 bg-white/90 shadow-2xs space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ইন্টার্ন প্রোফাইল ও অ্যাকাউন্ট</span>
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          Intern Member Profile
        </h1>
        <p className="text-xs text-slate-500">
          আপনার প্রোফাইল তথ্য ও মোট সম্পন্ন কাজের হিসেব।
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 glass-panel rounded-2xl bg-white">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0F766E]" />
          <span>প্রোফাইল লোড হচ্ছে...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* User Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0F766E] to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {currentUser?.full_name?.charAt(0) || "I"}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {currentUser?.full_name || "Intern Member"}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    সক্রিয়
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>ইন্টার্ন ও ট্রেইনি (Intern / Trainee)</span>
                </div>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>ইমেইল এড্রেস:</span>
                </span>
                <span className="font-semibold text-slate-800">
                  {currentUser?.email || "intern@assdi.org"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>মোবাইল নম্বর:</span>
                </span>
                <span className="font-semibold text-slate-800">
                  {currentUser?.phone || "01711-000004"}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-1">
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>মোট কাজের লগ</span>
              </span>
              <div className="text-2xl font-black text-slate-900">
                {logs.length}
              </div>
              <span className="text-[10px] text-slate-400 block">
                সাবমিট করা হয়েছে
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-1">
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>কাজের সময়কাল</span>
              </span>
              <div className="text-2xl font-black text-[#0F766E]">
                {Math.round(totalHours * 10) / 10} <span className="text-xs font-normal">hrs</span>
              </div>
              <span className="text-[10px] text-slate-400 block">
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
            className="w-full py-3 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            <span>লগআউট করুন (Sign Out)</span>
          </button>
        </div>
      )}
    </div>
  );
}
