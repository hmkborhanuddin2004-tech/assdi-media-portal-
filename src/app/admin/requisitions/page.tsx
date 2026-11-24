"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileCheck2,
  AlertTriangle,
  Check,
  X,
  ShieldAlert,
  Search,
} from "lucide-react";
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

  const handleApprove = async (id: string) => {
    setActionError(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/requisitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || "অনুমোদন করা সম্ভব হয়নি।");
        return;
      }

      // Update state locally
      setRequisitions((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "approved", rejection_reason: null } : r
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "সার্ভার এরর।";
      setActionError(msg);
    } finally {
      setActionLoading(false);
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
    <div className="space-y-6 w-full max-w-full pb-10">
      {/* Top Banner Matching Dashboard Mockup */}
      <div className="glass-panel rounded-2xl p-5 md:p-6 border border-emerald-600/20 bg-white/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0F766E] text-xs font-semibold">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>মিডিয়া হেড প্রশাসন • কিউ ম্যানেজমেন্ট</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Course Requisitions (Approval Queue)
          </h1>
          <p className="text-xs text-slate-500">
            সকল কোর্সের ভিডিও শুটিং রিকুইজিশন পর্যালোচনা, অনুমোদন এবং ইমার্জেন্সি ওভাররাইড কিউ।
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowEmergencyModal(true)}
            id="create-emergency-btn"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency Override Requisition</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-slate-200/80 bg-white/80">
          <span className="text-[11px] font-semibold text-slate-500 block">মোট রিকুইজিশন</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900">{requisitions.length}</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-amber-200 bg-amber-50/50">
          <span className="text-[11px] font-semibold text-amber-700 block">অনুমোদনের অপেক্ষায় (Pending)</span>
          <span className="text-xl sm:text-2xl font-bold text-amber-900">{countPending}</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
          <span className="text-[11px] font-semibold text-emerald-700 block">অনুমোদিত (Approved)</span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-900">{countApproved}</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-rose-200 bg-rose-50/50">
          <span className="text-[11px] font-semibold text-rose-700 block">বাতিলকৃত (Rejected)</span>
          <span className="text-xl sm:text-2xl font-bold text-rose-900">{countRejected}</span>
        </div>
      </div>

      {/* Error alert */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
              activeFilter === "all"
                ? "bg-[#0F766E] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
            }`}
          >
            সকল ({requisitions.length})
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
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
              activeFilter === "approved"
                ? "bg-[#0F766E] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
            }`}
          >
            অনুমোদিত ({countApproved})
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

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="কোর্স বা প্রোগ্রাম খুঁজুন..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
          />
        </div>
      </div>

      {/* Requisitions List Table / Cards */}
      <div className="space-y-3" id="admin-requisitions-list">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 glass-panel rounded-xl">
            অনুমোদন কিউ লোড হচ্ছে...
          </div>
        ) : filteredRequisitions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 glass-panel rounded-xl border border-dashed border-slate-200">
            কোনো রিকুইজিশন পাওয়া যায়নি।
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
                className="glass-panel p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3 bg-white/90 hover:border-[#0F766E]/40 transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">
                      {req.course_name}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {programMeta?.en || req.program_type} ({req.format_duration})
                    </span>

                    {/* Emergency Override Badge */}
                    {req.is_emergency_override && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300">
                        Emergency Override
                      </span>
                    )}

                    {/* Status Pill */}
                    {isPending && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                        Pending
                      </span>
                    )}
                    {isApproved && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        Approved
                      </span>
                    )}
                    {isRejected && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                        Rejected
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {req.id.slice(0, 14)}
                  </span>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">তারিখ ও কল টাইম</span>
                    <span className="font-semibold text-slate-800">
                      {req.shoot_date} • {req.call_time}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ভেন্যু ও ফ্র্রেমিং</span>
                    <span className="font-semibold text-slate-800">
                      {req.venue_name || "Venue"} | {FRAMING_LABELS[req.framing_type] || req.framing_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">কোঅর্ডিনেটর যোগাযোগ</span>
                    <span className="font-semibold text-slate-800">
                      {req.coordinator_phone || "Phone"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">অতিরিক্ত নোট</span>
                    <span className="text-slate-600 italic line-clamp-1">
                      {req.notes || "কোনো নোট নেই"}
                    </span>
                  </div>
                </div>

                {/* If Emergency Override, show reason */}
                {req.is_emergency_override && req.override_reason && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <span className="font-bold">Override Reason: </span>
                    <span>{req.override_reason}</span>
                  </div>
                )}

                {/* If Rejected, show reason */}
                {isRejected && req.rejection_reason && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                    <span className="font-bold">Rejection Reason: </span>
                    <span className="font-semibold">{req.rejection_reason}</span>
                  </div>
                )}

                {/* Action Buttons for Pending Requisitions */}
                {isPending && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      onClick={() => handleApprove(req.id)}
                      id={`approve-btn-${req.id}`}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve (অনুমোদন)</span>
                    </button>

                    <button
                      onClick={() => handleOpenReject(req.id)}
                      id={`reject-btn-${req.id}`}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject (বাতিল)</span>
                    </button>
                  </div>
                )}

                {/* Inline Rejection Form when Reject button clicked */}
                {rejectingId === req.id && (
                  <div className="mt-3 p-4 rounded-xl border border-rose-200 bg-rose-50/70 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-900">
                        রিকুইজিশন বাতিলের সুনির্দিষ্ট কারণ লিখুন (Mandatory Rejection Reason)*
                      </span>
                      <button
                        onClick={() => setRejectingId(null)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        বাতিল করুন
                      </button>
                    </div>

                    <textarea
                      id={`rejection-reason-input-${req.id}`}
                      rows={2}
                      value={rejectionReason}
                      placeholder="কারণ উল্লেখ করুন (যেমন: Camera team fully booked on this date. Please reschedule.)..."
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-rose-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      required
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRejectingId(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold"
                      >
                        ফিরে যান
                      </button>
                      <button
                        type="button"
                        id={`confirm-reject-btn-${req.id}`}
                        onClick={() => handleConfirmReject(req.id)}
                        disabled={actionLoading}
                        className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
                      >
                        {actionLoading ? "প্রক্রিয়াধীন..." : "নিশ্চিত বাতিল করুন (Confirm Reject)"}
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-6 space-y-4 my-8 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
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
          </div>
        </div>
      )}
    </div>
  );
}
