"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FilePlus2,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import type { UserProfile } from "@/lib/types/auth";
import type { ProgramType, FramingType } from "@/lib/types/database";
import {
  PROGRAM_TYPES,
  PROGRAM_TYPE_LABELS,
  FORMAT_DURATIONS,
  FRAMING_TYPES,
  FRAMING_LABELS,
  getDhakaTodayString,
  getRequiredLeadDays,
  getEarliestAllowedDateString,
  checkLeadTimeCompliance,
} from "@/lib/validations/requisitions";
import type { Venue, RequisitionItem } from "@/lib/requisitions/store";

export default function CoordinatorNewRequisitionPage() {
  const router = useRouter();

  // Current session & loaded metadata
  const [user, setUser] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<{ id: string; name: string; code: string }[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [existingRequests, setExistingRequests] = useState<RequisitionItem[]>([]);

  // Form State
  const [courseId, setCourseId] = useState<string>("");
  const [programType, setProgramType] = useState<ProgramType>("visitor_reel");
  const [formatDuration, setFormatDuration] = useState<string>("30-40s Reel");
  const [framingType, setFramingType] = useState<FramingType>("vertical_9_16");
  const [venueId, setVenueId] = useState<string>("");
  const [shootDate, setShootDate] = useState<string>("");
  const [callTime, setCallTime] = useState<string>("09:00 AM");
  const [coordinatorPhone, setCoordinatorPhone] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Emergency Override (Admin only)
  const [isEmergencyOverride, setIsEmergencyOverride] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>("");

  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Fetch user, venues, and existing course requisitions
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch current user
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) {
            setUser(meData.user);
            setCoordinatorPhone(meData.user.phone || "");
            if (meData.user.course_id) {
              setCourseId(meData.user.course_id);
            }
          }
        }

        // Fetch requisitions, venues, courses
        const reqRes = await fetch("/api/requisitions");
        if (reqRes.ok) {
          const data = await reqRes.json();
          if (data.venues) {
            setVenues(data.venues);
            if (data.venues.length > 0) {
              setVenueId(data.venues[0].id);
            }
          }
          if (data.courses) {
            setCourses(data.courses);
          }
          if (data.requisitions) {
            setExistingRequests(data.requisitions.slice(0, 5));
          }
        }
      } catch (err) {
        console.error("Failed to load requisition metadata:", err);
      }
    }
    loadData();
  }, []);

  // When user is coordinator, keep course_id locked to their assigned course
  useEffect(() => {
    if (user && user.role === "coordinator" && user.course_id) {
      setCourseId(user.course_id);
    } else if (user && user.role === "admin" && courses.length > 0 && !courseId) {
      setCourseId(courses[0].id);
    }
  }, [user, courses, courseId]);

  // Lead-time calculation in Asia/Dhaka
  const dhakaToday = getDhakaTodayString();
  const requiredDays = getRequiredLeadDays(programType);
  const earliestAllowedDate = getEarliestAllowedDateString(programType, dhakaToday);

  // Check compliance whenever shootDate, programType, or emergency override changes
  const compliance = shootDate
    ? checkLeadTimeCompliance({
        programType,
        shootDate,
        isEmergencyOverride,
        overrideReason,
        callerRole: user?.role,
        todayStr: dhakaToday,
      })
    : { ok: true, requiredDays, earliestDate: earliestAllowedDate };

  const isLeadTimeViolated = shootDate ? !compliance.ok : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Front-end lead-time check
    if (!shootDate) {
      setFormError("শুটিংয়ের তারিখ নির্বাচন করুন (Shoot date is required)");
      return;
    }

    if (!isEmergencyOverride && !compliance.ok) {
      setFormError(
        compliance.error ||
          `Lead-time rule violation: ${programType} requires at least ${requiredDays} days notice before shoot_date (Asia/Dhaka). Earliest allowed: ${earliestAllowedDate}.`
      );
      return;
    }

    if (isEmergencyOverride && (!overrideReason || overrideReason.trim().length === 0)) {
      setFormError("Emergency Override requires a non-empty override_reason.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        course_id: courseId,
        program_type: programType,
        format_duration: formatDuration,
        framing_type: framingType,
        venue_id: venueId,
        shoot_date: shootDate,
        call_time: callTime,
        coordinator_phone: coordinatorPhone,
        notes: notes.trim() || null,
        is_emergency_override: user?.role === "admin" ? isEmergencyOverride : false,
        override_reason: user?.role === "admin" && isEmergencyOverride ? overrideReason.trim() : null,
      };

      const res = await fetch("/api/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.error || "রিকুইজিশন জমা দেওয়া সম্ভব হয়নি।");
        return;
      }

      setFormSuccess("রিকুইজিশন সফলভাবে গৃহীত হয়েছে! মিডিয়া হেড অনুমোদনের অপেক্ষায় রয়েছে।");

      // Refresh recent requests
      const refreshRes = await fetch("/api/requisitions");
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.requisitions) {
          setExistingRequests(refreshData.requisitions.slice(0, 5));
        }
      }

      // Smooth redirect after short pause
      setTimeout(() => {
        router.push("/coordinator/requests");
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "সার্ভার এরর। আবার চেষ্টা করুন।";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const assignedCourse =
    courses.find((c) => c.id === courseId) ||
    (user?.course_name ? { name: user.course_name, code: user.course_code || "" } : null);

  return (
    <div className="space-y-5 w-full max-w-full pb-10">
      {/* Flat Linear/Stripe Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4E4E7]">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#09090B] tracking-tight">
            New Requisition
          </h1>
          {assignedCourse?.name && (
            <p className="text-xs text-[#71717A] mt-0.5">{assignedCourse.name}</p>
          )}
        </div>

        <Link
          href="/coordinator/requests"
          id="view-my-requests-link"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#09090B] text-xs font-medium shrink-0"
        >
          <span>My Requests</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#71717A]" />
        </Link>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Requisition Form */}
        <div className="lg:col-span-7 bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 sm:p-6 space-y-5">
          <div className="border-b border-[#E4E4E7] pb-3.5">
            <h2 className="text-sm font-semibold text-[#09090B]">
              Shoot Request Details
            </h2>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div
              id="form-error"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">ত্রুটি (Validation Error):</p>
                <p>{formError}</p>
              </div>
            </div>
          )}

          {/* Form Success Banner */}
          {formSuccess && (
            <div
              id="form-success"
              className="p-3 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7] text-[#09090B] text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
              <span className="font-medium">{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" id="requisition-form">
            {/* Field 1: Course Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="course_id"
                className="block text-xs font-medium text-[#52525B]"
              >
                Course Name
              </label>

              {user?.role === "admin" ? (
                <select
                  id="course_id"
                  name="course_id"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] bg-white text-xs sm:text-sm font-medium text-[#09090B] focus:outline-none focus:border-[#0F766E]"
                  required
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    id="course_name_locked"
                    readOnly
                    value={assignedCourse?.name || "কোর্স লোড হচ্ছে..."}
                    className="w-full px-3 py-2 pr-9 rounded-lg border border-[#E4E4E7] bg-[#F4F4F5] text-xs sm:text-sm font-medium text-[#52525B] cursor-not-allowed"
                  />
                  <Lock className="w-3.5 h-3.5 text-[#71717A] absolute right-3 top-1/2 -translate-y-1/2" />
                  <input type="hidden" id="course_id" name="course_id" value={courseId} />
                </div>
              )}
            </div>

            {/* Field 2: Program Type */}
            <div className="space-y-2">
              <label
                htmlFor="program_type"
                className="block text-xs font-medium text-[#52525B]"
              >
                Program Type
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROGRAM_TYPES.map((pt) => {
                  const meta = PROGRAM_TYPE_LABELS[pt];
                  const isSelected = programType === pt;
                  return (
                    <button
                      type="button"
                      key={pt}
                      id={`chip-program-${pt}`}
                      onClick={() => setProgramType(pt)}
                      className={`p-2.5 rounded-lg border text-left transition-colors duration-150 flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? "bg-[#0F766E] border-[#0F766E] text-white font-medium"
                          : "bg-white border-[#E4E4E7] text-[#09090B] hover:bg-[#F9FAFB]"
                      }`}
                    >
                      <span className="text-xs leading-tight font-medium">{meta.en}</span>
                      <span
                        className={`text-[11px] mt-1 tabular-nums ${
                          isSelected ? "text-white/80" : "text-[#71717A]"
                        }`}
                      >
                        {meta.major ? "৭ দিন অগ্রিম" : "৩ দিন অগ্রিম"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <select
                id="program_type"
                name="program_type"
                value={programType}
                onChange={(e) => setProgramType(e.target.value as ProgramType)}
                className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] text-xs text-[#09090B] focus:outline-none focus:border-[#0F766E]"
                required
              >
                {PROGRAM_TYPES.map((pt) => {
                  const meta = PROGRAM_TYPE_LABELS[pt];
                  return (
                    <option key={pt} value={pt}>
                      {meta.en} ({meta.bn}) {meta.major ? "— ৭ দিন অগ্রিম" : "— ৩ দিন অগ্রিম"}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Field 3: Format & Duration */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#52525B]">
                Format &amp; Duration
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FORMAT_DURATIONS.map((fmt) => {
                  const isSelected = formatDuration === fmt;
                  return (
                    <button
                      type="button"
                      key={fmt}
                      id={`format-${fmt.replace(/\s+/g, "-")}`}
                      onClick={() => setFormatDuration(fmt)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors duration-150 text-center cursor-pointer ${
                        isSelected
                          ? "bg-[#0F766E] border-[#0F766E] text-white"
                          : "bg-white border-[#E4E4E7] text-[#52525B] hover:bg-[#F9FAFB]"
                      }`}
                    >
                      {fmt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 4: Framing Toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#52525B]">
                Framing Toggle
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FRAMING_TYPES.map((frm) => {
                  const isSelected = framingType === frm;
                  return (
                    <button
                      type="button"
                      key={frm}
                      id={`framing-${frm}`}
                      onClick={() => setFramingType(frm)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors duration-150 text-center cursor-pointer ${
                        isSelected
                          ? "bg-[#0F766E] border-[#0F766E] text-white"
                          : "bg-white border-[#E4E4E7] text-[#52525B] hover:bg-[#F9FAFB]"
                      }`}
                    >
                      {FRAMING_LABELS[frm]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 5: Venue */}
            <div className="space-y-1.5">
              <label
                htmlFor="venue_id"
                className="block text-xs font-medium text-[#52525B]"
              >
                Venue
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  id="venue_id"
                  name="venue_id"
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E4E4E7] bg-white text-xs sm:text-sm text-[#09090B] focus:outline-none focus:border-[#0F766E]"
                  required
                >
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Field 6: Shoot Date & Call Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="shoot_date"
                  className="block text-xs font-medium text-[#52525B]"
                >
                  Shoot Date
                </label>
                <div className="relative">
                  <CalendarIcon className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    id="shoot_date"
                    name="shoot_date"
                    value={shootDate}
                    onChange={(e) => setShootDate(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 rounded-lg border text-xs sm:text-sm text-[#09090B] tabular-nums focus:outline-none ${
                      isLeadTimeViolated
                        ? "border-red-400 bg-red-50/40"
                        : "border-[#E4E4E7] bg-white focus:border-[#0F766E]"
                    }`}
                    required
                  />
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Earliest available: <span className="font-medium text-[#09090B] font-mono tabular-nums">{earliestAllowedDate}</span> (Asia/Dhaka)
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="call_time"
                  className="block text-xs font-medium text-[#52525B]"
                >
                  Call Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="call_time"
                    name="call_time"
                    value={callTime}
                    placeholder="09:00 AM"
                    onChange={(e) => setCallTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E4E4E7] bg-white text-xs sm:text-sm text-[#09090B] tabular-nums focus:outline-none focus:border-[#0F766E]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Field 7: Coordinator Phone */}
            <div className="space-y-1.5">
              <label
                htmlFor="coordinator_phone"
                className="block text-xs font-medium text-[#52525B]"
              >
                Coordinator Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  id="coordinator_phone"
                  name="coordinator_phone"
                  value={coordinatorPhone}
                  placeholder="017XX-XXXXXX"
                  onChange={(e) => setCoordinatorPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E4E4E7] bg-white text-xs sm:text-sm text-[#09090B] tabular-nums focus:outline-none focus:border-[#0F766E]"
                  required
                />
              </div>
            </div>

            {/* Field 8: Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="notes"
                className="block text-xs font-medium text-[#52525B]"
              >
                Special Requirements / Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                value={notes}
                placeholder="শুটিংয়ের বিশেষ কোনো দৃশ্য, বিষয়বস্তু বা প্রয়োজনীয় নির্দেশিকা লিখুন..."
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] bg-white text-xs sm:text-sm text-[#09090B] focus:outline-none focus:border-[#0F766E]"
              />
            </div>

            {/* Emergency Override (Admin Only) */}
            {user?.role === "admin" && (
              <div className="p-3.5 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] space-y-2.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-[#09090B]">
                    মিডিয়া হেড বিশেষ ক্ষমতা (Emergency Override)
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="is_emergency_override"
                    checked={isEmergencyOverride}
                    onChange={(e) => setIsEmergencyOverride(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  <span className="text-xs text-[#52525B]">
                    জরুরি শুটিং ওভাররাইড সক্ষম করুন (Bypass 3/7-day notice)
                  </span>
                </label>

                {isEmergencyOverride && (
                  <div className="space-y-1">
                    <label
                      htmlFor="override_reason"
                      className="block text-[11px] font-medium text-[#09090B]"
                    >
                      Emergency Override Reason (Mandatory)*
                    </label>
                    <textarea
                      id="override_reason"
                      name="override_reason"
                      rows={2}
                      value={overrideReason}
                      placeholder="জরুরি ভিত্তিতে শুটিংয়ের সুনির্দিষ্ট কারণ লিখুন..."
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] bg-white text-xs text-[#09090B] focus:outline-none focus:border-[#0F766E]"
                      required={isEmergencyOverride}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Lead-Time Rule Banner */}
            <div
              id="lead-time-notice"
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-colors duration-150 ${
                isLeadTimeViolated
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-[#FAFAFA] border-[#E4E4E7] text-[#52525B]"
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isLeadTimeViolated ? "text-red-600" : "text-[#71717A]"
                }`}
              />
              <div className="space-y-0.5">
                <p className="font-semibold text-[#09090B]">
                  {isLeadTimeViolated
                    ? "লিড-টাইম লঙ্ঘন (Lead-Time Rule Violation):"
                    : `Minimum ${requiredDays} days lead time required`}
                </p>
                <p className="text-[11px] leading-relaxed">
                  {isLeadTimeViolated
                    ? `প্রোগ্রাম টাইপ '${programType}' এর জন্য শুটিংয়ের তারিখের অন্তত ${requiredDays} দিন পূর্বে রিকুইজিশন জমা দেওয়া বাধ্যতামূলক (Asia/Dhaka time)। সর্বনিন্ম অনুমোদিত তারিখ: ${earliestAllowedDate}`
                    : `এই প্রোগ্রামটির জন্য ঢাকা সময় অনুযায়ী অন্তত ${requiredDays} দিন পূর্বে রিকুইজিশন জমা দিতে হবে। সর্বনিন্ম অনুমোদিত তারিখ: ${earliestAllowedDate}`}
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                id="submit-requisition-btn"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F766E] hover:bg-[#0D645D] text-white text-xs sm:text-sm font-medium transition-colors duration-150 disabled:opacity-60 cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>{submitting ? "জমা হচ্ছে..." : "Submit Requisition"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Course Requests */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <h3 className="text-xs font-medium text-[#52525B] uppercase tracking-wider">
                Recent Course Requests
              </h3>
              <span className="text-[11px] font-medium text-[#71717A] tabular-nums">
                {existingRequests.length} items
              </span>
            </div>

            <div className="space-y-2.5" id="course-requests-list">
              {existingRequests.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#71717A]">
                  No requests submitted yet.
                </div>
              ) : (
                existingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#09090B] line-clamp-1">
                        {req.notes || `${req.course_name || "Course"} • ${req.format_duration}`}
                      </span>

                      {req.status === "approved" && req.final_drive_url && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#E4E4E7] text-[#09090B] text-[10.5px] font-medium shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
                          <span>Delivered</span>
                        </span>
                      )}
                      {req.status === "approved" && !req.final_drive_url && (req.task_stage === "shoot_done" || req.task_stage === "editing" || req.task_stage === "review") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#E4E4E7] text-[#27272A] text-[10.5px] font-medium shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#52525B]" />
                          <span>Shoot Done</span>
                        </span>
                      )}
                      {req.status === "approved" && !req.final_drive_url && req.task_stage !== "shoot_done" && req.task_stage !== "editing" && req.task_stage !== "review" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#E4E4E7] text-[#27272A] text-[10.5px] font-medium shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
                          <span>Approved</span>
                        </span>
                      )}
                      {req.status === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#E4E4E7] text-[#27272A] text-[10.5px] font-medium shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#71717A]" />
                          <span>Pending</span>
                        </span>
                      )}
                      {req.status === "rejected" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[10.5px] font-medium shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#71717A] flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                      <span>{req.shoot_date}</span>
                      <span>•</span>
                      <span>{req.call_time}</span>
                      <span>•</span>
                      <span>{req.framing_type === "vertical_9_16" ? "Vertical 9:16" : "Horizontal 16:9"}</span>
                    </div>

                    {req.final_drive_url && (
                      <div className="pt-1">
                        <a
                          href={req.final_drive_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0F766E] hover:bg-[#0D645D] text-white text-[11px] font-medium"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Google Drive Link</span>
                        </a>
                      </div>
                    )}

                    {req.status === "rejected" && req.rejection_reason && (
                      <div className="p-2 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-[11px]">
                        <span className="font-medium">Reason: </span>
                        <span>{req.rejection_reason}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[#E4E4E7] pt-3 flex items-center justify-between text-xs">
              <span className="px-2 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#27272A] text-[11px] font-medium">
                {assignedCourse?.name || "Assigned Course"}
              </span>
              <Link
                href="/coordinator/requests"
                className="text-xs font-medium text-[#0F766E] hover:underline"
              >
                View all
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
