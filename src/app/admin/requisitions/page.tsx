"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Check,
  X,
  ShieldAlert,
  Search,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import { MODAL_TRANSITION } from "@/lib/motion";
import type { RequisitionItem } from "@/lib/requisitions/store";
import type { ProgramType, FramingType } from "@/lib/types/database";
import {
  PROGRAM_TYPE_LABELS,
  FRAMING_LABELS,
  PROGRAM_TYPES,
  FORMAT_DURATIONS,
  FRAMING_TYPES,
} from "@/lib/validations/requisitions";
import type { Venue } from "@/lib/requisitions/store";
import { ApproveAndAssignModal } from "@/components/tasks/ApproveAndAssignModal";
import { ShootAssignmentSlipModal } from "@/components/tasks/ShootAssignmentSlipModal";
import type { ShootSlipData, EnrichedTask } from "@/lib/tasks/store";

type FilterStatus = "all" | "pending" | "approved" | "rejected";

export default function AdminRequisitionsPage() {
  const [requisitions, setRequisitions] = useState<RequisitionItem[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string; code: string }[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Rejection modal / active item
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Approve & Assign Modal + Shoot Slip Modal states
  const [approvingReq, setApprovingReq] = useState<RequisitionItem | null>(null);
  const [activeSlip, setActiveSlip] = useState<ShootSlipData | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  // Emergency Requisition Modal
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyCourseId, setEmergencyCourseId] = useState("");
  const [emergencyProgramType, setEmergencyProgramType] = useState<ProgramType>("visitor_reel");
  const [emergencyFormat, setEmergencyFormat] = useState("30-40s Reel");
  const [emergencyFraming, setEmergencyFraming] = useState<FramingType>("vertical_9_16");
  const [emergencyVenueId, setEmergencyVenueId] = useState("");
  const [emergencyDate, setEmergencyDate] = useState("");
  const [emergencyCallTime, setEmergencyCallTime] = useState("09:00 AM");
  const [emergencyPhone, setEmergencyPhone] = useState("01711000001");
  const [emergencyNotes, setEmergencyNotes] = useState("");
  const [emergencyReason, setEmergencyReason] = useState("");
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/requisitions");
      if (res.ok) {
        const data = await res.json();
        if (data.requisitions) {
          setRequisitions(data.requisitions);
        }
        if (data.venues) {
          setVenues(data.venues);
          if (data.venues.length > 0 && !emergencyVenueId) {
            setEmergencyVenueId(data.venues[0].id);
          }
        }
        if (data.courses) {
          setCourses(data.courses);
          if (data.courses.length > 0 && !emergencyCourseId) {
            setEmergencyCourseId(data.courses[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load admin requisitions:", err);
    } finally {
      setLoading(false);
    }
  }, [emergencyVenueId, emergencyCourseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApproveSuccess = (_task: EnrichedTask, slip: ShootSlipData) => {
    setActiveSlip(slip);
    setShowSlipModal(true);
    fetchData();
  };

  const handleViewSlip = async (req: RequisitionItem) => {
    if (req.task_id) {
      try {
        const res = await fetch(`/api/tasks/${req.task_id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.slip) {
            setActiveSlip(data.slip);
            setShowSlipModal(true);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load task slip:", err);
      }
    }
  };

  const handleOpenReject = (id: string) => {
    setRejectingId(id);
    setRejectionReason("");
    setActionError(null);
  };

  const handleConfirmReject = async (id: string) => {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      setActionError("Rejection requires a non-empty rejection_reason.");
      return;
    }

    setActionError(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/requisitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejection_reason: rejectionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || "বাতিল করা সম্ভব হয়নি।");
        return;
      }

      // Update state locally
      setRequisitions((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "rejected", rejection_reason: rejectionReason.trim() }
            : r
        )
      );
      setRejectingId(null);
      setRejectionReason("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "সার্ভার এরর।";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateEmergencyRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmergencyError(null);

    if (!emergencyReason || emergencyReason.trim().length === 0) {
      setEmergencyError("Emergency Override requires a non-empty override_reason.");
      return;
    }

    if (!emergencyDate) {
      setEmergencyError("শুটিংয়ের তারিখ নির্বাচন করুন (Shoot date required)");
      return;
    }

    setEmergencySubmitting(true);
    try {
      const payload = {
        course_id: emergencyCourseId,
        program_type: emergencyProgramType,
        format_duration: emergencyFormat,
        framing_type: emergencyFraming,
        venue_id: emergencyVenueId,
        shoot_date: emergencyDate,
        call_time: emergencyCallTime,
        coordinator_phone: emergencyPhone,
        notes: emergencyNotes.trim() || null,
        is_emergency_override: true,
        override_reason: emergencyReason.trim(),
      };

      const res = await fetch("/api/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setEmergencyError(data.error || "রিকুইজিশন তৈরি করা সম্ভব হয়নি।");
        return;
      }

      setShowEmergencyModal(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "সার্ভার এরর।";
      setEmergencyError(msg);
    } finally {
      setEmergencySubmitting(false);
    }
  };

  const filteredRequisitions = requisitions.filter((r) => {
    if (activeFilter === "pending" && r.status !== "pending") return false;
    if (activeFilter === "approved" && r.status !== "approved") return false;
    if (activeFilter === "rejected" && r.status !== "rejected") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCourse = r.course_name?.toLowerCase().includes(q);
      const matchType = r.program_type?.toLowerCase().includes(q);
      const matchNotes = r.notes?.toLowerCase().includes(q);
      return matchCourse || matchType || matchNotes;
    }
    return true;
  });

  const countPending = requisitions.filter((r) => r.status === "pending").length;
  const countApproved = requisitions.filter((r) => r.status === "approved").length;
  const countRejected = requisitions.filter((r) => r.status === "rejected").length;

  return (
    <div className="space-y-5 w-full max-w-full pb-10">
      {/* Flat Linear/Stripe Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4E4E7]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#09090B] tracking-tight">
          Requisitions
        </h1>

        <button
          onClick={() => setShowEmergencyModal(true)}
          id="create-emergency-btn"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D645D] text-white text-xs font-medium cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Emergency Override</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E4E4E7] rounded-lg p-3.5">
          <span className="text-xs font-medium text-[#71717A] block">Total</span>
          <span className="text-xl font-semibold text-[#09090B] mt-1 block tabular-nums">
            {requisitions.length}
          </span>
        </div>
        <div className="bg-white border border-[#E4E4E7] rounded-lg p-3.5">
          <span className="text-xs font-medium text-[#71717A] block">Pending</span>
          <span className="text-xl font-semibold text-[#09090B] mt-1 block tabular-nums">
            {countPending}
          </span>
        </div>
        <div className="bg-white border border-[#E4E4E7] rounded-lg p-3.5">
          <span className="text-xs font-medium text-[#71717A] block">Approved</span>
          <span className="text-xl font-semibold text-[#0F766E] mt-1 block tabular-nums">
            {countApproved}
          </span>
        </div>
        <div className="bg-white border border-[#E4E4E7] rounded-lg p-3.5">
          <span className="text-xs font-medium text-[#71717A] block">Rejected</span>
          <span className="text-xl font-semibold text-[#DC2626] mt-1 block tabular-nums">
            {countRejected}
          </span>
        </div>
      </div>

      {/* Error alert */}
      {actionError && (
        <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-[#DC2626] hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E4E4E7] rounded-lg p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs tabular-nums">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-2.5 py-1.5 rounded-md font-medium shrink-0 ${
              activeFilter === "all"
                ? "bg-[#09090B] text-white"
                : "bg-[#FAFAFA] border border-[#E4E4E7] text-[#52525B] hover:text-[#09090B]"
            }`}
          >
            All ({requisitions.length})
          </button>
          <button
            onClick={() => setActiveFilter("pending")}
            className={`px-2.5 py-1.5 rounded-md font-medium shrink-0 ${
              activeFilter === "pending"
                ? "bg-[#09090B] text-white"
                : "bg-[#FAFAFA] border border-[#E4E4E7] text-[#52525B] hover:text-[#09090B]"
            }`}
          >
            Pending ({countPending})
          </button>
          <button
            onClick={() => setActiveFilter("approved")}
            className={`px-2.5 py-1.5 rounded-md font-medium shrink-0 ${
              activeFilter === "approved"
                ? "bg-[#09090B] text-white"
                : "bg-[#FAFAFA] border border-[#E4E4E7] text-[#52525B] hover:text-[#09090B]"
            }`}
          >
            Approved ({countApproved})
          </button>
          <button
            onClick={() => setActiveFilter("rejected")}
            className={`px-2.5 py-1.5 rounded-md font-medium shrink-0 ${
              activeFilter === "rejected"
                ? "bg-[#09090B] text-white"
                : "bg-[#FAFAFA] border border-[#E4E4E7] text-[#52525B] hover:text-[#09090B]"
            }`}
          >
            Rejected ({countRejected})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses or programs..."
            className="w-full h-8 pl-8 pr-3 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] text-xs text-[#09090B] placeholder-[#71717A] focus:outline-none focus:bg-white focus:border-[#0F766E]"
          />
        </div>
      </div>

      {/* Requisitions List */}
      <div className="space-y-3" id="admin-requisitions-list">
        {loading ? (
          <div className="bg-white border border-[#E4E4E7] rounded-lg p-8 text-center text-xs text-[#71717A]">
            Loading requisitions...
          </div>
        ) : filteredRequisitions.length === 0 ? (
          <div className="bg-white border border-[#E4E4E7] rounded-lg p-8 text-center text-xs text-[#71717A]">
            No requisitions found.
          </div>
        ) : (
          filteredRequisitions.map((req) => {
            const isPending = req.status === "pending";
            const isApproved = req.status === "approved";
            const isRejected = req.status === "rejected";
            const programMeta = req.program_type ? PROGRAM_TYPE_LABELS[req.program_type] : null;

            return (
              <div
                key={req.id}
                id={`admin-req-${req.id}`}
                className="bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 space-y-3"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4E4E7] pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#09090B]">
                      {req.course_name}
                    </span>
                    <span className="text-xs text-[#71717A]">•</span>
                    <span className="text-xs text-[#52525B]">
                      {programMeta?.en || req.program_type} ({req.format_duration})
                    </span>

                    {req.is_emergency_override && (
                      <span className="px-2 py-0.5 rounded-md bg-[#FEF2F2] text-[#DC2626] text-[10.5px] font-medium border border-[#FECACA]">
                        Emergency Override
                      </span>
                    )}

                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#27272A] text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#71717A]" />
                        <span>Pending</span>
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#27272A] text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
                        <span>Approved</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-[#71717A] font-mono tabular-nums">
                    {req.id.slice(0, 14)}
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
                    <span className="text-[#71717A] block text-[11px]">Venue &amp; Framing</span>
                    <span className="font-medium text-[#09090B]">
                      {req.venue_name || "Venue"} | {FRAMING_LABELS[req.framing_type] || req.framing_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#71717A] block text-[11px]">Coordinator Phone</span>
                    <span className="font-mono font-medium text-[#09090B]">
                      {req.coordinator_phone || "Phone"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#71717A] block text-[11px]">Notes</span>
                    <span className="text-[#52525B] line-clamp-1">
                      {req.notes || "—"}
                    </span>
                  </div>
                </div>

                {req.is_emergency_override && req.override_reason && (
                  <div className="p-2.5 rounded-md bg-[#FAFAFA] border border-[#E4E4E7] text-[#52525B] text-xs">
                    <span className="font-medium text-[#09090B]">Override Reason: </span>
                    <span>{req.override_reason}</span>
                  </div>
                )}

                {isRejected && req.rejection_reason && (
                  <div className="p-2.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs">
                    <span className="font-medium">Rejection Reason: </span>
                    <span>{req.rejection_reason}</span>
                  </div>
                )}

                {isPending && (
                  <div className="pt-2 border-t border-[#E4E4E7] flex items-center justify-end gap-2">
                    <button
                      onClick={() => setApprovingReq(req)}
                      id={`approve-btn-${req.id}`}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D645D] text-white text-xs font-medium cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve &amp; Assign</span>
                    </button>

                    <button
                      onClick={() => handleOpenReject(req.id)}
                      id={`reject-btn-${req.id}`}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#FEF2F2] hover:border-[#FECACA] text-[#DC2626] text-xs font-medium cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}

                {isApproved && (
                  <div className="pt-2 border-t border-[#E4E4E7] flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleViewSlip(req)}
                      id={`view-slip-btn-${req.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#09090B] text-xs font-medium cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#52525B]" />
                      <span>Shoot Slip</span>
                    </button>
                  </div>
                )}

                {rejectingId === req.id && (
                  <div className="mt-2 p-3.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#991B1B]">
                        Rejection Reason (Required) *
                      </span>
                      <button
                        onClick={() => setRejectingId(null)}
                        className="text-[#52525B] hover:text-[#09090B] text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <textarea
                      id={`rejection-reason-input-${req.id}`}
                      rows={2}
                      value={rejectionReason}
                      placeholder="Specify reason (e.g., Camera team fully booked on this date. Please reschedule.)..."
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-[#FECACA] bg-white text-xs text-[#09090B] focus:outline-none focus:border-[#DC2626]"
                      required
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRejectingId(null)}
                        className="px-3 py-1.5 rounded-md border border-[#E4E4E7] bg-white text-[#52525B] text-xs font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        id={`confirm-reject-btn-${req.id}`}
                        onClick={() => handleConfirmReject(req.id)}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 rounded-md bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-medium"
                      >
                        {actionLoading ? "Processing..." : "Confirm Reject"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Emergency Requisition Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-[#09090B]/40 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={MODAL_TRANSITION}
            className="w-full max-w-lg bg-white rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-[#E4E4E7] p-5 space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#0F766E]" />
                <h3 className="text-base font-bold text-slate-900">
                  Create Emergency Override Requisition
                </h3>
              </div>
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {emergencyError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {emergencyError}
              </div>
            )}

            <form onSubmit={handleCreateEmergencyRequisition} className="space-y-3.5">
              {/* Course */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Course</label>
                <select
                  id="emergency-course-id"
                  value={emergencyCourseId}
                  onChange={(e) => setEmergencyCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800"
                  required
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Program Type */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Program Type</label>
                <select
                  id="emergency-program-type"
                  value={emergencyProgramType}
                  onChange={(e) => setEmergencyProgramType(e.target.value as ProgramType)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800"
                  required
                >
                  {PROGRAM_TYPES.map((pt) => (
                    <option key={pt} value={pt}>
                      {PROGRAM_TYPE_LABELS[pt].en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Format & Framing */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Format</label>
                  <select
                    id="emergency-format"
                    value={emergencyFormat}
                    onChange={(e) => setEmergencyFormat(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800"
                  >
                    {FORMAT_DURATIONS.map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {fmt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Framing</label>
                  <select
                    id="emergency-framing"
                    value={emergencyFraming}
                    onChange={(e) => setEmergencyFraming(e.target.value as FramingType)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800"
                  >
                    {FRAMING_TYPES.map((frm) => (
                      <option key={frm} value={frm}>
                        {FRAMING_LABELS[frm]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Venue */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Venue</label>
                <select
                  id="emergency-venue"
                  value={emergencyVenueId}
                  onChange={(e) => setEmergencyVenueId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800"
                  required
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Shoot Date</label>
                  <input
                    type="date"
                    id="emergency-date"
                    value={emergencyDate}
                    onChange={(e) => setEmergencyDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Call Time</label>
                  <input
                    type="text"
                    id="emergency-call-time"
                    value={emergencyCallTime}
                    onChange={(e) => setEmergencyCallTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Phone & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Coordinator Phone</label>
                  <input
                    type="tel"
                    id="emergency-phone"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Notes (Optional)</label>
                  <input
                    type="text"
                    id="emergency-notes"
                    value={emergencyNotes}
                    onChange={(e) => setEmergencyNotes(e.target.value)}
                    placeholder="নোট..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Mandatory Override Reason */}
              <div className="space-y-1 pt-1">
                <label className="block text-xs font-bold text-amber-900">
                  Emergency Override Reason (Mandatory)*
                </label>
                <textarea
                  id="emergency-override-reason"
                  rows={2}
                  value={emergencyReason}
                  placeholder="ইমার্জেন্সি শুটিংয়ের সুনির্দিষ্ট কারণ লিখুন..."
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/40 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-emergency-btn"
                  disabled={emergencySubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
                >
                  {emergencySubmitting ? "Creating..." : "Create Emergency Requisition"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Atomic Approve & Assign Modal */}
      <ApproveAndAssignModal
        key={approvingReq ? approvingReq.id : "modal-closed"}
        requisition={approvingReq}
        isOpen={Boolean(approvingReq)}
        onClose={() => setApprovingReq(null)}
        onSuccess={handleApproveSuccess}
      />

      {/* Shoot Assignment Slip Modal */}
      <ShootAssignmentSlipModal
        key={activeSlip ? activeSlip.slip_number : "slip-closed"}
        slip={activeSlip}
        isOpen={showSlipModal}
        onClose={() => setShowSlipModal(false)}
      />
    </div>
  );
}
