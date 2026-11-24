"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FilePlus2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import type { RequisitionItem } from "@/lib/requisitions/store";
import type { UserProfile } from "@/lib/types/auth";
import { PROGRAM_TYPE_LABELS, FRAMING_LABELS } from "@/lib/validations/requisitions";

type FilterStatus = "all" | "pending" | "approved" | "shoot_done" | "delivered" | "rejected";

export default function CoordinatorRequestsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [requisitions, setRequisitions] = useState<RequisitionItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);

  const fetchRequisitions = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user);
      }

      const res = await fetch("/api/requisitions");
      if (res.ok) {
        const data = await res.json();
        if (data.requisitions) {
          setRequisitions(data.requisitions);
        }
      }
    } catch (err) {
      console.error("Failed to fetch requisitions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const getFilteredRequisitions = () => {
    if (activeFilter === "all") return requisitions;
    if (activeFilter === "pending") return requisitions.filter((r) => r.status === "pending");
    if (activeFilter === "approved") {
      return requisitions.filter(
        (r) =>
          r.status === "approved" &&
          !r.final_drive_url &&
          r.task_stage !== "completed" &&
          r.task_stage !== "shoot_done" &&
          r.task_stage !== "editing" &&
          r.task_stage !== "review"
      );
    }
    if (activeFilter === "shoot_done") {
      return requisitions.filter(
        (r) =>
          r.status === "approved" &&
          !r.final_drive_url &&
          r.task_stage !== "completed" &&
          (r.task_stage === "shoot_done" || r.task_stage === "editing" || r.task_stage === "review")
      );
    }
    if (activeFilter === "delivered") {
      return requisitions.filter(
        (r) => r.status === "approved" && (Boolean(r.final_drive_url) || r.task_stage === "completed")
      );
    }
    if (activeFilter === "rejected") {
      return requisitions.filter((r) => r.status === "rejected");
    }
    return requisitions;
  };

  const filtered = getFilteredRequisitions();

  const countAll = requisitions.length;
  const countPending = requisitions.filter((r) => r.status === "pending").length;
  const countApproved = requisitions.filter(
    (r) =>
      r.status === "approved" &&
      !r.final_drive_url &&
      r.task_stage !== "completed" &&
      r.task_stage !== "shoot_done" &&
      r.task_stage !== "editing" &&
      r.task_stage !== "review"
  ).length;
  const countShootDone = requisitions.filter(
    (r) =>
      r.status === "approved" &&
      !r.final_drive_url &&
      r.task_stage !== "completed" &&
      (r.task_stage === "shoot_done" || r.task_stage === "editing" || r.task_stage === "review")
  ).length;
  const countDelivered = requisitions.filter(
    (r) => r.status === "approved" && (Boolean(r.final_drive_url) || r.task_stage === "completed")
  ).length;
  const countRejected = requisitions.filter((r) => r.status === "rejected").length;

  return (
    <div className="space-y-6 w-full max-w-full pb-10">
      {/* Top Banner (Preserves Gate 3 E2E test texts) */}
      <div className="glass-panel rounded-2xl p-5 md:p-6 border border-emerald-600/20 bg-white/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0F766E] text-xs font-semibold">
            <span>কোর্স কোঅর্ডিনেটর পোর্টাল • {user?.course_name || "আমার কোর্স"}</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
            কোর্স মিডিয়া রিকুইজিশন ট্র্যাকার
          </h1>
          <p className="text-xs text-slate-500">
            আপনার কোর্স হতে প্রেরিত সকল শুটিং রিকুইজিশনের রিয়েল-টাইম অগ্রগতি ও
            ফাইনাল গুগল ড্রাইভ ডেলিভারি লিংক।
          </p>
        </div>

        <Link
          href="/coordinator/new"
          id="coordinator-new-req-btn"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all duration-150 shrink-0"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>নতুন রিকুইজিশন দিন</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs" id="status-filters">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
            activeFilter === "all"
              ? "bg-[#0F766E] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          }`}
        >
          সকল ({countAll})
        </button>
        <button
          onClick={() => setActiveFilter("pending")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
            activeFilter === "pending"
              ? "bg-[#0F766E] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          }`}
        >
          পেন্ডিং ({countPending})
        </button>
        <button
          onClick={() => setActiveFilter("approved")}
          id="filter-approved"
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
            activeFilter === "approved"
              ? "bg-[#0F766E] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          }`}
        >
          অনুমোদিত ({countApproved})
        </button>
        <button
          onClick={() => setActiveFilter("shoot_done")}
          id="filter-shoot-done"
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
            activeFilter === "shoot_done"
              ? "bg-[#0F766E] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          }`}
        >
          শ্যুট সম্পন্ন ({countShootDone})
        </button>
        <button
          onClick={() => setActiveFilter("delivered")}
          id="filter-delivered"
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
            activeFilter === "delivered"
              ? "bg-[#0F766E] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          }`}
        >
          ডেলিভার্ড ({countDelivered})
        </button>
        <button
          onClick={() => setActiveFilter("rejected")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
            activeFilter === "rejected"
              ? "bg-[#0F766E] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          }`}
        >
          বাতিলকৃত ({countRejected})
        </button>
      </div>

      {/* Requisitions List */}
      <div className="space-y-3" id="requisitions-container">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 glass-panel rounded-xl">
            রিকুইজিশন তালিকা লোড হচ্ছে...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 glass-panel rounded-xl border border-dashed border-slate-200">
            এই ক্যাটাগরিতে কোনো রিকুইজিশন পাওয়া যায়নি।
          </div>
        ) : (
          filtered.map((req) => {
            const isDelivered = req.status === "approved" && (Boolean(req.final_drive_url) || req.task_stage === "completed");
            const isShootDone = req.status === "approved" && (req.task_stage === "shoot_done" || req.task_stage === "editing" || req.task_stage === "review");
            const isApproved = req.status === "approved" && !isDelivered && !isShootDone;
            const isRejected = req.status === "rejected";
            const isPending = req.status === "pending";

            const programMeta = req.program_type ? PROGRAM_TYPE_LABELS[req.program_type] : null;

            return (
              <div
                key={req.id}
                id={`req-card-${req.id}`}
                className="glass-panel p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3 hover:border-[#0F766E]/40 transition-all bg-white/90"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    {isDelivered && (
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[11px] font-bold">
                        Delivered (সম্পন্ন)
                      </span>
                    )}
                    {isShootDone && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                        Shoot Done (পোস্ট-প্রোডাকশন)
                      </span>
                    )}
                    {isApproved && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        Approved (অনুমোদিত)
                      </span>
                    )}
                    {isPending && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                        Pending (বিবেচনাধীন)
                      </span>
                    )}
                    {isRejected && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                        Rejected (বাতিলকৃত)
                      </span>
                    )}

                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      {req.notes || `${req.course_name} • ${programMeta?.en || req.program_type}`}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {req.id.slice(0, 12)}
                  </span>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">তারিখ ও সময়</span>
                    <span className="font-semibold text-slate-800">
                      {req.shoot_date} • {req.call_time}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ভেন্যু</span>
                    <span className="font-semibold text-slate-800">
                      {req.venue_name || "Venue"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ফরম্যাট ও অনুপাত</span>
                    <span className="font-semibold text-slate-800">
                      {req.format_duration} ({FRAMING_LABELS[req.framing_type] || req.framing_type})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">স্ট্যাটাস অ্যাকশন</span>
                    {isDelivered && req.final_drive_url ? (
                      <a
                        href={req.final_drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#0F766E] hover:underline font-semibold"
                      >
                        <span>গুগল ড্রাইভ লিংক</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-600 font-medium">
                        {isPending ? "হেডের অনুমোদনের অপেক্ষায়" : isApproved ? "শুটিং টিম নির্ধারিত" : "পর্যালোচনাধীন"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Exact Rejection Reason (Mandatory Non-Empty) */}
                {isRejected && req.rejection_reason && (
                  <div
                    id={`rejection-reason-${req.id}`}
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Reason: </span>
                      <span className="font-medium text-rose-900">{req.rejection_reason}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="text-center pt-2">
        <span className="text-[11px] font-medium text-slate-400">
          Viewing course requests for assigned scope
        </span>
      </div>
    </div>
  );
}
