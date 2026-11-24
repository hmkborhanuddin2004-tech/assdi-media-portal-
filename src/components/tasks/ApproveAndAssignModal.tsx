"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Users,
  Camera,
  Calendar,
  AlertCircle,
  Loader2,
  Check,
  Crown,
} from "lucide-react";
import type { RequisitionItem } from "@/lib/requisitions/store";
import type { EnrichedTask, ShootSlipData } from "@/lib/tasks/store";
import type { GearItem } from "@/lib/gear/store";

interface CandidateUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "staff" | "intern";
}

interface ApproveAndAssignModalProps {
  requisition: RequisitionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: EnrichedTask, slip: ShootSlipData) => void;
}

export function ApproveAndAssignModal({
  requisition,
  isOpen,
  onClose,
  onSuccess,
}: ApproveAndAssignModalProps) {
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [gearList, setGearList] = useState<GearItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form states
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [leadStaffId, setLeadStaffId] = useState<string>("");
  const [deadlineAt, setDeadlineAt] = useState<string>("");
  const [selectedGearIds, setSelectedGearIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");

  // Submitting / Error states
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictDetails, setConflictDetails] = useState<{
    code?: string;
    formatted_message?: string;
  } | null>(null);

  // Initialize defaults when modal opens with a requisition
  useEffect(() => {
    if (!isOpen || !requisition) return;

    setErrorMessage(null);
    setConflictDetails(null);
    setNotes(requisition.notes || "");

    // Default deadline: shoot date + 2 days at 18:00
    const shootDate = requisition.shoot_date || new Date().toISOString().split("T")[0];
    const defaultDeadline = new Date(shootDate);
    defaultDeadline.setDate(defaultDeadline.getDate() + 2);
    defaultDeadline.setHours(18, 0, 0, 0);
    setDeadlineAt(defaultDeadline.toISOString().slice(0, 16));

    // Fetch team candidates and gear
    const fetchCandidates = async () => {
      setLoadingData(true);
      try {
        const res = await fetch("/api/tasks/team-candidates");
        if (res.ok) {
          const data = await res.json();
          if (data.candidates) {
            setCandidates(data.candidates);
            // Default select Arif Rahman (staff lead) & Hasan Ali (intern) if available
            const arif = data.candidates.find((c: CandidateUser) => c.name.includes("Arif"));
            const hasan = data.candidates.find((c: CandidateUser) => c.name.includes("Hasan"));

            const initialAssignees: string[] = [];
            if (arif) {
              initialAssignees.push(arif.id);
              setLeadStaffId(arif.id);
            }
            if (hasan) {
              initialAssignees.push(hasan.id);
            }
            if (initialAssignees.length > 0) {
              setSelectedAssignees(initialAssignees);
            }
          }
          if (data.gear) {
            setGearList(data.gear);
            // Default select an available camera body
            const availableCamera = data.gear.find(
              (g: GearItem) => g.category === "camera_body" && g.status === "available"
            );
            if (availableCamera) {
              setSelectedGearIds([availableCamera.id]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load candidates/gear:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchCandidates();
  }, [isOpen, requisition]);

  if (!isOpen || !requisition) return null;

  // Toggle member selection (2–3 members max)
  const toggleAssignee = (userId: string) => {
    setErrorMessage(null);
    if (selectedAssignees.includes(userId)) {
      if (selectedAssignees.length <= 2) {
        setErrorMessage("কমপক্ষে ২ জন টিম মেম্বার নির্বাচন করতে হবে।");
        return;
      }
      const updated = selectedAssignees.filter((id) => id !== userId);
      setSelectedAssignees(updated);
      if (leadStaffId === userId) {
        setLeadStaffId(updated[0] || "");
      }
    } else {
      if (selectedAssignees.length >= 3) {
        setErrorMessage("সর্বোচ্চ ৩ জন টিম মেম্বার নির্বাচন করা যাবে।");
        return;
      }
      const updated = [...selectedAssignees, userId];
      setSelectedAssignees(updated);
      if (!leadStaffId) {
        setLeadStaffId(userId);
      }
    }
  };

  // Toggle gear selection (at least 1 item)
  const toggleGear = (gearId: string) => {
    setErrorMessage(null);
    setConflictDetails(null);
    if (selectedGearIds.includes(gearId)) {
      setSelectedGearIds(selectedGearIds.filter((id) => id !== gearId));
    } else {
      setSelectedGearIds([...selectedGearIds, gearId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setConflictDetails(null);

    // Client-side validations
    if (selectedAssignees.length < 2 || selectedAssignees.length > 3) {
      setErrorMessage("শুটিং টিমে অবশ্যই ২ থেকে ৩ জন সদস্য থাকতে হবে।");
      return;
    }
    if (!leadStaffId || !selectedAssignees.includes(leadStaffId)) {
      setErrorMessage("নির্বাচিত সদস্যদের মধ্য থেকে ১ জন টিম লিড নির্ধারণ করুন।");
      return;
    }
    if (!deadlineAt) {
      setErrorMessage("কাজের ডেডলাইন নির্ধারণ করুন।");
      return;
    }
    if (selectedGearIds.length === 0) {
      setErrorMessage("কমপক্ষে ১টি শুটিং সরঞ্জাম/ক্যামেরা নির্বাচন করুন।");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/tasks/approve-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisition_id: requisition.id,
          lead_staff_id: leadStaffId,
          assignee_ids: selectedAssignees,
          deadline_at: new Date(deadlineAt).toISOString(),
          gear_ids: selectedGearIds,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === "23P01") {
          // Double-booking conflict
          setConflictDetails({
            code: "23P01",
            formatted_message:
              data.details?.formatted_message || data.error || "Gear double-booking conflict detected.",
          });
        }
        setErrorMessage(data.error || "অনুমোদন ব্যর্থ হয়েছে।");
        return;
      }

      // Success
      onSuccess(data.task, data.slip);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "নেটওয়ার্ক বা সার্ভার সমস্যা হয়েছে।";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      id="approve-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        id="approve-assign-modal-card"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-100 text-[#0F766E]">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                রিকুইজিশন অনুমোদন ও টিম অ্যাসাইনমেন্ট
              </h3>
              <p className="text-[11px] text-slate-500">
                {requisition.course_name} • {requisition.format_duration} • {requisition.shoot_date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            id="close-approve-modal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* PostgreSQL 23P01 Conflict Banner */}
          {conflictDetails && (
            <div
              id="gear-conflict-alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block text-rose-900">
                  Double-Booking Blocked (PostgreSQL Code: 23P01)
                </span>
                <p className="text-rose-700 font-medium">
                  {conflictDetails.formatted_message}
                </p>
              </div>
            </div>
          )}

          {/* General Error Banner */}
          {errorMessage && !conflictDetails && (
            <div
              id="approve-error-banner"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Pick 2–3 Member Team & Designate Lead */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0F766E]" />
                <span>শুটিং টিম মেম্বার নির্বাচন (২–৩ জন)</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                নির্বাচিত: {selectedAssignees.length} / ৩ জন
              </span>
            </div>

            {loadingData ? (
              <div className="text-xs text-slate-400 p-4 text-center">
                টিম মেম্বার তালিকা লোড হচ্ছে...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="team-selection-grid">
                {candidates.map((candidate) => {
                  const isSelected = selectedAssignees.includes(candidate.id);
                  const isLead = leadStaffId === candidate.id;

                  return (
                    <div
                      key={candidate.id}
                      onClick={() => toggleAssignee(candidate.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-[#0F766E] bg-emerald-50/60 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">
                            {candidate.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              candidate.role === "staff"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {candidate.role === "staff" ? "Staff" : "Intern"}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {candidate.phone}
                        </span>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {isSelected && (
                          <button
                            type="button"
                            onClick={() => setLeadStaffId(candidate.id)}
                            title={isLead ? "টিম লিড" : "লিড বানাতে ক্লিক করুন"}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                              isLead
                                ? "bg-[#0F766E] text-white shadow-xs"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                            }`}
                          >
                            <Crown className="w-3 h-3" />
                            <span>{isLead ? "Project Lead" : "Make Lead"}</span>
                          </button>
                        )}
                        <div
                          onClick={() => toggleAssignee(candidate.id)}
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isSelected
                              ? "bg-[#0F766E] border-[#0F766E] text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Live Deadline Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#0F766E]" />
              <span>কাজের ডেডলাইন (Deadline)</span>
            </label>
            <input
              type="datetime-local"
              id="task-deadline-input"
              value={deadlineAt}
              onChange={(e) => setDeadlineAt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
              required
            />
          </div>

          {/* 3. Camera / Gear Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#0F766E]" />
                <span>শুটিং সরঞ্জাম / গিয়ার নির্বাচন</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                নির্বাচিত: {selectedGearIds.length}টি
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1" id="gear-selection-list">
              {gearList.map((gear) => {
                const isSelected = selectedGearIds.includes(gear.id);
                const isMaintenance = gear.status === "maintenance";

                return (
                  <div
                    key={gear.id}
                    onClick={() => {
                      if (!isMaintenance) toggleGear(gear.id);
                    }}
                    className={`p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                      isMaintenance
                        ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200"
                        : isSelected
                        ? "border-[#0F766E] bg-emerald-50/60 shadow-xs cursor-pointer"
                        : "border-slate-200 hover:border-slate-300 bg-white cursor-pointer"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{gear.name}</span>
                        {isMaintenance && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            Maintenance
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {gear.serial_number}
                      </span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        isSelected
                          ? "bg-[#0F766E] border-[#0F766E] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              id="confirm-approve-assign-btn"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>অনুমোদন ও অ্যাসাইন হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>অনুমোদন ও টিম অ্যাসাইন করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
