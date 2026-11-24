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
  Film,
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
    <div className="space-y-6 w-full max-w-full pb-10">
      {/* Top Banner Matching Institutional Theme */}
      <div className="glass-panel rounded-2xl p-5 md:p-6 border border-emerald-600/20 bg-white/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0F766E] text-xs font-semibold">
            <Film className="w-3.5 h-3.5" />
            <span>
              {user?.role === "admin"
                ? "মিডিয়া হেড প্রশাসন প্যানেল"
                : `কোর্স কোঅর্ডিনেটর পোর্টাল • ${assignedCourse?.name || "কোর্স"}`}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Course Requisition Portal
          </h1>
          <p className="text-xs text-slate-500">
            নতুন ভিডিও শুটিং ও মিডিয়া কাভারেজের জন্য রিকুইজিশন ফর্ম পূরণ করুন।
          </p>
        </div>

        <Link
          href="/coordinator/requests"
          id="view-my-requests-link"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold shadow-xs transition-all duration-150 shrink-0"
        >
          <span>My Requests</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Requisition Form (Mockup matching) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 sm:p-7 border border-white/80 shadow-sm bg-white/85 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0F766E] flex items-center justify-center font-bold">
                <FilePlus2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  New Shoot Requisition Form
                </h2>
                <p className="text-[11px] text-slate-500">
                  সঠিক তথ্য প্রদান করে শুটিংয়ের জন্য অগ্রিম শিডিউল নিশ্চিত করুন।
                </p>
              </div>
            </div>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div
              id="form-error"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">ত্রুটি (Validation Error):</p>
                <p className="text-rose-700">{formError}</p>
              </div>
            </div>
          )}

          {/* Form Success Banner */}
          {formSuccess && (
            <div
              id="form-success"
              className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-fadeIn"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" id="requisition-form">
            {/* Field 1: Course Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="course_id"
                className="block text-xs font-semibold text-slate-700"
              >
                Course Name
              </label>

              {user?.role === "admin" ? (
                // Admin sees all courses in a live dropdown
                <select
                  id="course_id"
                  name="course_id"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                  required
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </option>
                  ))}
                </select>
              ) : (
                // Coordinator: Course strictly locked to assigned course_id
                <div className="relative">
                  <input
                    type="text"
                    id="course_name_locked"
                    readOnly
                    value={assignedCourse?.name || "কোর্স লোড হচ্ছে..."}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 cursor-not-allowed"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input type="hidden" id="course_id" name="course_id" value={courseId} />
                </div>
              )}
            </div>

            {/* Field 2: Program Type */}
            <div className="space-y-2">
              <label
                htmlFor="program_type"
                className="block text-xs font-semibold text-slate-700"
              >
                Program Type
              </label>

              {/* Selectable Chip Buttons */}
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
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-[#0F766E] border-[#0F766E] text-white shadow-xs font-bold"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                      }`}
                    >
                      <span className="text-xs leading-tight">{meta.en}</span>
                      <span
                        className={`text-[10px] mt-1 ${
                          isSelected ? "text-emerald-100" : "text-slate-400"
                        }`}
                      >
                        {meta.major ? "৭ দিন অগ্রিম" : "৩ দিন অগ্রিম"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Accessible Synchronized Dropdown */}
              <select
                id="program_type"
                name="program_type"
                value={programType}
                onChange={(e) => setProgramType(e.target.value as ProgramType)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
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

            {/* Field 3: Format & Duration (Pill Toggles matching Mockup) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Format &amp; Duration
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {FORMAT_DURATIONS.map((fmt) => {
                  const isSelected = formatDuration === fmt;
                  return (
                    <button
                      type="button"
                      key={fmt}
                      id={`format-${fmt.replace(/\s+/g, "-")}`}
                      onClick={() => setFormatDuration(fmt)}
                      className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border transition-all duration-150 text-center ${
                        isSelected
                          ? "bg-[#0F766E] border-[#0F766E] text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {fmt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 4: Framing Toggle (Pill Toggles matching Mockup) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Framing Toggle
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {FRAMING_TYPES.map((frm) => {
                  const isSelected = framingType === frm;
                  return (
                    <button
                      type="button"
                      key={frm}
                      id={`framing-${frm}`}
                      onClick={() => setFramingType(frm)}
                      className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border transition-all duration-150 text-center ${
                        isSelected
                          ? "bg-[#0F766E] border-[#0F766E] text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
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
                className="block text-xs font-semibold text-slate-700"
              >
                Venue
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  id="venue_id"
                  name="venue_id"
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="shoot_date"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Shoot Date
                </label>
                <div className="relative">
                  <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    id="shoot_date"
                    name="shoot_date"
                    value={shootDate}
                    onChange={(e) => setShootDate(e.target.value)}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 ${
                      isLeadTimeViolated
                        ? "border-rose-400 ring-2 ring-rose-200 bg-rose-50/30"
                        : "border-slate-200 bg-white focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                    }`}
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Earliest available: <span className="font-semibold text-[#0F766E] font-mono">{earliestAllowedDate}</span> (Asia/Dhaka)
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="call_time"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Call Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="call_time"
                    name="call_time"
                    value={callTime}
                    placeholder="09:00 AM"
                    onChange={(e) => setCallTime(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Field 7: Coordinator Phone */}
            <div className="space-y-1.5">
              <label
                htmlFor="coordinator_phone"
                className="block text-xs font-semibold text-slate-700"
              >
                Coordinator Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  id="coordinator_phone"
                  name="coordinator_phone"
                  value={coordinatorPhone}
                  placeholder="017XX-XXXXXX"
                  onChange={(e) => setCoordinatorPhone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                  required
                >
                </input>
              </div>
            </div>

            {/* Field 8: Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="notes"
                className="block text-xs font-semibold text-slate-700"
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
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
              />
            </div>

            {/* Emergency Override (Admin Only) */}
            {user?.role === "admin" && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold text-amber-900">
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
                  <span className="text-xs text-slate-700 font-medium">
                    জরুরি শুটিং ওভাররাইড সক্ষম করুন (Bypass 3/7-day notice)
                  </span>
                </label>

                {isEmergencyOverride && (
                  <div className="space-y-1 animate-fadeIn">
                    <label
                      htmlFor="override_reason"
                      className="block text-[11px] font-semibold text-amber-900"
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
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required={isEmergencyOverride}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Lead-Time Rule Banner (Mockup Matching) */}
            <div
              id="lead-time-notice"
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all duration-150 ${
                isLeadTimeViolated
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-amber-50/80 border-amber-200 text-amber-800"
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isLeadTimeViolated ? "text-rose-600" : "text-amber-600"
                }`}
              />
              <div className="space-y-0.5">
                <p className="font-semibold">
                  {isLeadTimeViolated
                    ? "লিড-টাইম লঙ্ঘন (Lead-Time Rule Violation):"
                    : `⚠️ Minimum ${requiredDays} days lead time required`}
                </p>
                <p className="text-[11px] leading-relaxed">
                  {isLeadTimeViolated
                    ? `প্রোগ্রাম টাইপ '${programType}' এর জন্য শুটিংয়ের তারিখের অন্তত ${requiredDays} দিন পূর্বে রিকুইজিশন জমা দেওয়া বাধ্যতামূলক (Asia/Dhaka time)। সর্বনিন্ম অনুমোদিত তারিখ: ${earliestAllowedDate}`
                    : `এই প্রোগ্রামটির জন্য ঢাকা সময় অনুযায়ী অন্তত ${requiredDays} দিন পূর্বে রিকুইজিশন জমা দিতে হবে। সর্বনিন্ম অনুমোদিত তারিখ: ${earliestAllowedDate}`}
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="submit-requisition-btn"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0F766E] hover:bg-[#115E59] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all duration-150 disabled:opacity-60 cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>{submitting ? "জমা হচ্ছে..." : "Submit Requisition"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Course Requests (Mockup matching) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-sm bg-white/85 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                My Course Requests
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0F766E] text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E] animate-pulse"></span>
                <span>Live Status</span>
              </span>
            </div>

            {/* List of Requisition Cards */}
            <div className="space-y-3" id="course-requests-list">
              {existingRequests.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  এখনো কোনো রিকুইজিশন জমা দেওয়া হয়নি।
                </div>
              ) : (
                existingRequests.map((req) => {
                  return (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-white/70 shadow-xs space-y-2 hover:border-[#0F766E]/30 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">
                          {req.notes || `${req.course_name || "কোর্স"} • ${req.format_duration}`}
                        </span>

                        {/* Status Badge */}
                        {req.status === "approved" && req.final_drive_url && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold shrink-0">
                            Delivered
                          </span>
                        )}
                        {req.status === "approved" && !req.final_drive_url && (req.task_stage === "shoot_done" || req.task_stage === "editing" || req.task_stage === "review") && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0">
                            Shoot Done
                          </span>
                        )}
                        {req.status === "approved" && !req.final_drive_url && req.task_stage !== "shoot_done" && req.task_stage !== "editing" && req.task_stage !== "review" && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                            Approved
                          </span>
                        )}
                        {req.status === "pending" && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                            Pending
                          </span>
                        )}
                        {req.status === "rejected" && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold shrink-0">
                            Rejected
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>{req.shoot_date}</span>
                        <span>•</span>
                        <span>{req.call_time}</span>
                        <span>|</span>
                        <span>{req.framing_type === "vertical_9_16" ? "Vertical 9:16" : "Horizontal 16:9"}</span>
                      </div>

                      {/* Google Drive Link for Delivered */}
                      {req.final_drive_url && (
                        <div className="pt-1">
                          <a
                            href={req.final_drive_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-[11px] font-semibold shadow-xs transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Google Drive Link</span>
                          </a>
                        </div>
                      )}

                      {/* Exact Rejection Reason for Rejected */}
                      {req.status === "rejected" && req.rejection_reason && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                          <span className="font-semibold">Reason: </span>
                          <span>{req.rejection_reason}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#0F766E] bg-emerald-50 px-2.5 py-0.5 rounded-full">
                {assignedCourse?.name || "Assigned Course"}
              </span>
              <Link
                href="/coordinator/requests"
                className="text-xs font-semibold text-[#0F766E] hover:underline"
              >
                সবগুলো দেখুন
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
