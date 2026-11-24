"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Camera,
  FileText,
  Printer,
  Share2,
  CheckCircle2,
  ChevronRight,
  Loader2,
  CalendarDays,
  Search,
} from "lucide-react";
import type { CalendarWindow } from "@/lib/validations/calendar";
import { CALENDAR_WINDOW_LABELS } from "@/lib/validations/calendar";
import type { CalendarShootItem } from "@/lib/calendar/store";
import { ShootAssignmentSlipModal } from "@/components/tasks/ShootAssignmentSlipModal";

export default function AdminMasterCalendarPage() {
  const [activeWindow, setActiveWindow] = useState<CalendarWindow>("tomorrow");
  const [shoots, setShoots] = useState<CalendarShootItem[]>([]);
  const [selectedShootId, setSelectedShootId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bounds, setBounds] = useState<{
    todayStr: string;
    tomorrowStr: string;
    next3DaysEndStr: string;
    next7DaysEndStr: string;
  } | null>(null);

  // Mobile modal support
  const [showSlipModal, setShowSlipModal] = useState(false);

  const fetchCalendar = useCallback(async (windowType: CalendarWindow) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?window=${windowType}`);
      if (res.ok) {
        const data = await res.json();
        if (data.shoots) {
          setShoots(data.shoots);
          setBounds(data.bounds);
          // Auto-select first shoot if none selected or current selection not in list
          if (data.shoots.length > 0) {
            setSelectedShootId((prev) => {
              const stillExists = data.shoots.some((s: CalendarShootItem) => s.id === prev);
              return stillExists ? prev : data.shoots[0].id;
            });
          } else {
            setSelectedShootId(null);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load calendar data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(activeWindow);
  }, [activeWindow, fetchCalendar]);

  const handleTabChange = (windowType: CalendarWindow) => {
    setActiveWindow(windowType);
  };

  const filteredShoots = shoots.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (s.course_name || "").toLowerCase().includes(q) ||
      (s.course_code || "").toLowerCase().includes(q) ||
      (s.venue_name || "").toLowerCase().includes(q) ||
      (s.lead_name || "").toLowerCase().includes(q) ||
      (s.program_type_label || "").toLowerCase().includes(q) ||
      (s.gear_summary || "").toLowerCase().includes(q)
    );
  });

  const activeList = searchQuery.trim() ? filteredShoots : shoots;
  const selectedShoot =
    activeList.find((s) => s.id === selectedShootId) || activeList[0] || null;

  const handlePrintSlip = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleSelectShoot = (shoot: CalendarShootItem) => {
    setSelectedShootId(shoot.id);
  };

  const handleOpenMobileSlip = (shoot: CalendarShootItem) => {
    setSelectedShootId(shoot.id);
    setShowSlipModal(true);
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Emerald Glassmorphic Banner */}
      <div className="print:hidden glass-emerald-card rounded-2xl p-5 md:p-8 border border-emerald-600/20 shadow-xs relative overflow-hidden bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50">
        <div className="relative z-10 max-w-3xl space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-[#0F766E] text-xs font-semibold">
            <CalendarDays className="w-4 h-4" />
            <span>ASSDI Media Department • Master Schedule</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight leading-snug">
            মাস্টার শুটিং ক্যালেন্ডার • Master Calendar
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            আসন্ন শুটিং শিডিউল, ক্রু টিম, ভেন্যু ও স্বয়ংক্রিয় অ্যাসাইনমেন্ট স্লিপ
            (Automated Shoot Slip) এক নজরে।
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="print:hidden flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Tabs: Tomorrow, Next 3 Days, Next 7 Days */}
        <div className="inline-flex p-1 bg-slate-100/90 rounded-xl gap-1 shrink-0">
          {(["tomorrow", "next_3_days", "next_7_days"] as CalendarWindow[]).map((win) => {
            const isActive = activeWindow === win;
            const meta = CALENDAR_WINDOW_LABELS[win];
            return (
              <button
                key={win}
                id={`calendar-tab-${win}`}
                onClick={() => handleTabChange(win)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-[#0F766E] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <span>{meta.en}</span>
                <span className="hidden sm:inline text-[11px] opacity-80">
                  ({meta.bn})
                </span>
                {isActive && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-bold">
                    {shoots.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="calendar-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="কোর্স, ভেন্যু বা টিম দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] transition-all"
          />
        </div>
      </div>

      {/* Main 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:block print:w-full print:m-0 print:p-0">
        {/* Left Column: Chronological Shoot Schedule Cards (7 cols) */}
        <div className="print:hidden lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0F766E]" />
              <span>নির্ধারিত শুটিং তালিকা ({filteredShoots.length}টি)</span>
            </h2>
            {bounds && (
              <span className="text-[11px] text-slate-500 font-mono">
                {activeWindow === "tomorrow"
                  ? `তারিখ: ${bounds.tomorrowStr}`
                  : `উইন্ডো: ${bounds.todayStr} হতে ${
                      activeWindow === "next_3_days"
                        ? bounds.next3DaysEndStr
                        : bounds.next7DaysEndStr
                    }`}
              </span>
            )}
          </div>

          {loading ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" />
              <span className="text-xs font-medium">ক্যালেন্ডার ডাটা লোড হচ্ছে...</span>
            </div>
          ) : filteredShoots.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-dashed border-slate-300 text-slate-500 space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">
                  কোনো শুটিং শিডিউল পাওয়া যায়নি
                </p>
                <p className="text-xs text-slate-400">
                  {activeWindow === "tomorrow"
                    ? "আগামীকালের জন্য কোনো শুটিং নির্ধারিত নেই।"
                    : "নির্বাচিত সময়সীমার মধ্যে কোনো শুটিং নির্ধারিত নেই।"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3" id="calendar-shoots-list">
              {filteredShoots.map((shoot) => {
                const isSelected = selectedShoot?.id === shoot.id;
                return (
                  <div
                    key={shoot.id}
                    id={`shoot-card-${shoot.id}`}
                    onClick={() => handleSelectShoot(shoot)}
                    className={`glass-panel p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? "border-[#0F766E] bg-emerald-50/40 shadow-md ring-2 ring-[#0F766E]/20"
                        : "border-slate-200/90 hover:border-emerald-500/50 hover:bg-slate-50/60 shadow-xs"
                    }`}
                  >
                    {/* Top Row: Date & Call Time Badge + Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-[#0F766E] text-xs font-bold font-mono">
                          {shoot.shoot_date}
                        </span>
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span>{shoot.call_time}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {shoot.is_emergency_override && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Override
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            shoot.stage === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : shoot.stage === "review"
                              ? "bg-purple-100 text-purple-800"
                              : shoot.stage === "editing"
                              ? "bg-teal-100 text-teal-800"
                              : shoot.stage === "shoot_done"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {shoot.stage_label}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Course, Program Type & Venue */}
                    <div className="pt-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors">
                            {shoot.course_name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            {shoot.program_type_label} • {shoot.format_duration}
                          </p>
                        </div>

                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-mono shrink-0">
                          {shoot.course_code}
                        </span>
                      </div>

                      {/* Venue */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                        <span className="font-medium">{shoot.venue_name}</span>
                      </div>

                      {/* Assigned Team */}
                      <div className="flex items-center gap-2 text-xs pt-1">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div className="flex flex-wrap items-center gap-1.5">
                          {shoot.assignees.length > 0 ? (
                            shoot.assignees.map((member, idx) => {
                              const isLead = member.assignment_role === "lead";
                              return (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] ${
                                    isLead
                                      ? "bg-emerald-100 text-[#0F766E] font-bold"
                                      : "bg-slate-100 text-slate-700 font-medium"
                                  }`}
                                >
                                  {member.full_name}
                                  {isLead && (
                                    <span className="text-[9px] uppercase tracking-wide">
                                      (Lead)
                                    </span>
                                  )}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-400 italic text-xs">
                              {shoot.lead_name !== "Unassigned"
                                ? `${shoot.lead_name} (Lead)`
                                : "টিম নির্ধারিত হয়নি"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Checked-Out Gear */}
                      <div className="flex items-center gap-2 text-xs pt-0.5">
                        <Camera className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-600 text-[11px] truncate font-mono">
                          {shoot.gear_summary}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer / Action */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        স্লিপ: {shoot.slip.slip_number}
                      </span>

                      <div className="flex items-center gap-2">
                        {/* Mobile preview button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMobileSlip(shoot);
                          }}
                          className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0F766E] text-white text-xs font-medium"
                        >
                          <FileText className="w-3 h-3" />
                          <span>স্লিপ দেখুন</span>
                        </button>

                        <span
                          className={`hidden lg:inline-flex items-center gap-1 text-xs font-semibold ${
                            isSelected ? "text-[#0F766E]" : "text-slate-400 group-hover:text-slate-700"
                          }`}
                        >
                          <span>{isSelected ? "নির্বাচিত" : "বিস্তারিত দেখুন"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Automated Shoot Assignment Slip (5 cols) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-6 print:block print:w-full print:static print:m-0 print:p-0">
          <div className="space-y-3">
            <div className="print:hidden flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0F766E]" />
                <span>লাইভ শুট অ্যাসাইনমেন্ট স্লিপ</span>
              </h2>
              {selectedShoot && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0F766E] text-[11px] font-bold">
                  {selectedShoot.slip.slip_number}
                </span>
              )}
            </div>

            {selectedShoot ? (
              <div
                id="calendar-shoot-slip-panel"
                className="glass-panel bg-white/95 rounded-2xl p-6 border border-emerald-600/30 shadow-md space-y-5 relative overflow-hidden print:p-8 print:m-0 print:border-none print:shadow-none print:w-full print:bg-white"
              >
                {/* Slip Header Badge */}
                <div className="text-center pb-2 border-b border-slate-100">
                  <div className="inline-block border-2 border-dashed border-slate-800/80 px-4 py-1.5 rounded-lg bg-slate-50">
                    <span
                      id="calendar-slip-number-badge"
                      className="text-xs sm:text-sm font-extrabold tracking-widest uppercase text-slate-900"
                    >
                      ASSDI MEDIA • SHOOT SLIP {selectedShoot.slip.slip_number}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                    As-Sunnah Skill Development Institute • Media Department
                  </p>
                </div>

                {/* Slip Attributes */}
                <div className="space-y-3 divide-y divide-slate-100 text-xs sm:text-sm">
                  {/* Course */}
                  <div className="flex items-start justify-between pt-1 gap-3">
                    <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
                      Course
                    </span>
                    <span
                      id="calendar-slip-course"
                      className="font-bold text-slate-900 text-right"
                    >
                      {selectedShoot.slip.course_title}
                    </span>
                  </div>

                  {/* Venue */}
                  <div className="flex items-start justify-between pt-2.5 gap-3">
                    <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                      Venue
                    </span>
                    <span
                      id="calendar-slip-venue"
                      className="font-semibold text-slate-800 text-right"
                    >
                      {selectedShoot.slip.venue_name}
                    </span>
                  </div>

                  {/* Call Time */}
                  <div className="flex items-start justify-between pt-2.5 gap-3">
                    <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
                      Call Time
                    </span>
                    <span
                      id="calendar-slip-calltime"
                      className="font-bold text-[#0F766E] text-right font-mono"
                    >
                      {selectedShoot.slip.call_time_formatted}
                    </span>
                  </div>

                  {/* Team & Phones */}
                  <div className="flex items-start justify-between pt-2.5 gap-3">
                    <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#0F766E]" />
                      Team & Phones
                    </span>
                    <div
                      className="space-y-1 text-right"
                      id="calendar-slip-team-list"
                    >
                      {selectedShoot.slip.team_members.length > 0 ? (
                        selectedShoot.slip.team_members.map((m, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-end gap-1.5 text-xs text-slate-800 font-medium"
                          >
                            <span>{m.name}</span>
                            {m.is_lead && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-[#0F766E]">
                                Lead
                              </span>
                            )}
                            <span className="text-slate-400">•</span>
                            <span className="font-mono text-slate-600 font-semibold">
                              {m.phone}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-xs">
                          {selectedShoot.lead_name !== "Unassigned"
                            ? `${selectedShoot.lead_name} (${selectedShoot.lead_phone})`
                            : "টিম বরাদ্দ হয়নি"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assigned Gear */}
                  <div className="flex items-start justify-between pt-2.5 gap-3">
                    <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#0F766E]" />
                      Assigned Gear
                    </span>
                    <div
                      className="space-y-1 text-right max-w-[60%]"
                      id="calendar-slip-gear-list"
                    >
                      {selectedShoot.slip.assigned_gear.length > 0 ? (
                        selectedShoot.slip.assigned_gear.map((g, idx) => (
                          <div
                            key={idx}
                            className="text-slate-800 font-medium text-xs"
                          >
                            <span className="font-semibold">{g.name}</span>{" "}
                            <span className="text-slate-500 text-[11px] font-mono">
                              ({g.serial_number})
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          কোনো গিয়ার বরাদ্দ নেই
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Important Notice */}
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-[11px] text-[#0F766E] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    শুটিং শুরুর অন্তত ১৫ মিনিট আগে ভেন্যুতে উপস্থিত হয়ে গিয়ার
                    চেক-ইন নিশ্চিত করুন।
                  </span>
                </div>

                {/* 1-Click Action Buttons matching Step 6 */}
                <div className="print:hidden pt-2 flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={handlePrintSlip}
                    id="calendar-download-pdf-btn"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>

                  <a
                    href={selectedShoot.slip.whatsapp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="calendar-share-whatsapp-btn"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-xs transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share on WhatsApp</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-12 text-center rounded-2xl border border-dashed border-slate-300 text-slate-400">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs">
                  শুটিং স্লিপ দেখতে বাম পাশের তালিকা থেকে যেকোনো শুট নির্বাচন করুন।
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Shoot Assignment Slip Modal */}
      <ShootAssignmentSlipModal
        slip={selectedShoot?.slip || null}
        isOpen={showSlipModal}
        onClose={() => setShowSlipModal(false)}
      />
    </div>
  );
}
