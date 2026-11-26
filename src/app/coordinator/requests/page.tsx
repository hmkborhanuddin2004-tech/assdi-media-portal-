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
    <div className="space-y-5 w-full max-w-full pb-10">
      {/* Flat Linear/Stripe Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4E4E7]">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#09090B] tracking-tight">
            My Requests
          </h1>
          {user?.course_name && (
            <p className="text-xs text-[#71717A] mt-0.5">{user.course_name}</p>
          )}
        </div>

        <Link
          href="/coordinator/new"
          id="coordinator-new-req-btn"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D645D] text-white text-xs font-medium shrink-0"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          <span>New Requisition</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs tabular-nums" id="status-filters">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-2.5 py-1.5 rounded-md font-medium shrink-0 ${
            activeFilter === "all"
              ? "bg-[#09090B] text-white"
              : "bg-white border border-[#E4E4E7] text-[#52525B] hover:text-[#09090B]"
          }`}
        >
          All ({countAll})
        </button>
        <button
          onClick={() => setActiveFilter("pending")}
          className={`px-2.5 py-1.5 rounded-md font-medium shrink-0 ${
            activeFilter === "pending"
              ? "bg-[#09090B] text-white"
              : "bg-white border border-[#E4E4E7] text-[#52525B] hover:text-[#09090B]"
          }`}
        >
          Pending ({countPending})
        </button>
        <button
          onClick={() => setActiveFilter("approved")}
          id="filter-approved"
          className={`px-2.5 py-1.5 rounded-md font-medium shrink-0 ${
            activeFilter === "approved"
              ? "bg-[#09090B] text-white"
              : "bg-white border border-[#E4E4E7] text-[#52525B] hover:text-[#09090B]"
          }`}
        >
          Approved ({countApproved})
        </button>
        <button
          onClick={() => setActiveFilter("shoot_done")}
          id="filter-shoot-done"
          className={`px-2.5 py-1.5 rounded-md font-medium shrink-0 ${
            activeFilter === "shoot_done"
              ? "bg-[#09090B] text-white"
              : "bg-white border border-[#E4E4E7] text-[#52525B] hover:text-[#09090B]"
          }`}
        >
          Shoot Done ({countShootDone})
        </button>
        <button
          onClick={() => setActiveFilter("delivered")}
          id="filter-delivered"
          className={`px-2.5 py-1.5 rounded-md font-medium shrink-0 ${
            activeFilter === "delivered"
              ? "bg-[#09090B] text-white"
              : "bg-white border border-[#E4E4E7] text-[#52525B] hover:text-[#09090B]"
          }`}
        >
          Delivered ({countDelivered})
        </button>
        <button
          onClick={() => setActiveFilter("rejected")}
          className={`px-2.5 py-1.5 rounded-md font-medium shrink-0 ${
            activeFilter === "rejected"
              ? "bg-[#09090B] text-white"
              : "bg-white border border-[#E4E4E7] text-[#52525B] hover:text-[#09090B]"
          }`}
        >
          Rejected ({countRejected})
        </button>
      </div>

      {/* Requisitions List */}
      <div className="space-y-3" id="requisitions-container">
        {loading ? (
          <div className="bg-white border border-[#E4E4E7] rounded-lg p-8 text-center text-xs text-[#71717A]">
            Loading requests...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#E4E4E7] rounded-lg p-8 text-center text-xs text-[#71717A]">
            No requisitions found in this view.
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
                className="bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 space-y-3"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4E4E7] pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isDelivered && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#09090B] text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
                        <span>Delivered (সম্পন্ন)</span>
                      </span>
                    )}
                    {isShootDone && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#27272A] text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#52525B]" />
                        <span>Shoot Done (পোস্ট-প্রোডাকশন)</span>
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#27272A] text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
                        <span>Approved (অনুমোদিত)</span>
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#27272A] text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#71717A]" />
                        <span>Pending (বিবেচনাধীন)</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                        <span>Rejected (বাতিলকৃত)</span>
                      </span>
                    )}

                    <span className="text-[13px] font-medium text-[#09090B]">
                      {req.notes || `${req.course_name} • ${programMeta?.en || req.program_type}`}
                    </span>
                  </div>

                  <span className="text-[11px] text-[#71717A] font-mono tabular-nums">
                    {req.id.slice(0, 12)}
                  </span>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                  <div>
                    <span className="text-[#71717A] block text-[11px]">Schedule</span>
                    <span className="font-medium text-[#09090B]">
                      {req.shoot_date} • {req.call_time}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#71717A] block text-[11px]">Venue</span>
                    <span className="font-medium text-[#09090B]">
                      {req.venue_name || "Venue"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#71717A] block text-[11px]">Format</span>
                    <span className="font-medium text-[#09090B]">
                      {req.format_duration} ({FRAMING_LABELS[req.framing_type] || req.framing_type})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#71717A] block text-[11px]">Delivery / Status</span>
                    {isDelivered && req.final_drive_url ? (
                      <a
                        href={req.final_drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#0F766E] hover:underline font-medium"
                      >
                        <span>Google Drive Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[#52525B]">
                        {isPending ? "Awaiting approval" : isApproved ? "Crew assigned" : "In progress"}
                      </span>
                    )}
                  </div>
                </div>

                {isRejected && req.rejection_reason && (
                  <div
                    id={`rejection-reason-${req.id}`}
                    className="p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Reason: </span>
                      <span>{req.rejection_reason}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
