"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Camera,
  FileText,
  Printer,
  Share2,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import type { CalendarWindow } from "@/lib/validations/calendar";
import { CALENDAR_WINDOW_LABELS } from "@/lib/validations/calendar";
import type { CalendarShootItem } from "@/lib/calendar/store";
import { ShootAssignmentSlipModal } from "@/components/tasks/ShootAssignmentSlipModal";
import { motion, LayoutGroup } from "framer-motion";
import { PILL_TRANSITION } from "@/lib/motion";

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
    <div className="space-y-5 w-full max-w-full">
      {/* Flat Linear/Stripe Header */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4DFD3]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#1A1917] tracking-tight">
          Calendar
        </h1>

        {bounds && (
          <span className="text-xs text-[#78716C] font-mono tabular-nums">
            {activeWindow === "tomorrow"
              ? bounds.tomorrowStr
              : `${bounds.todayStr} – ${
                  activeWindow === "next_3_days"
                    ? bounds.next3DaysEndStr
                    : bounds.next7DaysEndStr
                }`}
          </span>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="print:hidden bg-white border border-[#E4DFD3] rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5">
        {/* Tabs: Tomorrow, Next 3 Days, Next 7 Days */}
        <div className="inline-flex p-1 bg-[#EFECE4] border border-[#E4DFD3] rounded-md gap-1 shrink-0">
          <LayoutGroup id="calendar-tabs">
            {(["tomorrow", "next_3_days", "next_7_days"] as CalendarWindow[]).map((win) => {
              const isActive = activeWindow === win;
              const meta = CALENDAR_WINDOW_LABELS[win];
              return (
                <button
                  key={win}
                  id={`calendar-tab-${win}`}
                  onClick={() => handleTabChange(win)}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium select-none cursor-pointer"
                >
                  {isActive && (
                    <motion.div
                      layoutId="calendar-tab-active-pill"
                      transition={PILL_TRANSITION}
                      className="absolute inset-0 rounded bg-white border border-[#E4DFD3] shadow-[0_1px_2px_rgba(26,25,23,0.04)]"
                    />
                  )}
                  <Calendar
                    className={`relative z-10 w-3.5 h-3.5 shrink-0 ${
                      isActive ? "text-[#0F6B5D]" : "text-[#78716C]"
                    }`}
                  />
                  <span
                    className={`relative z-10 ${
                      isActive ? "text-[#1A1917]" : "text-[#57534E]"
                    }`}
                  >
                    {meta.en}
                  </span>
                  {isActive && (
                    <span className="relative z-10 ml-0.5 px-1.5 py-0.2 rounded bg-[#EFECE4] text-[#57534E] text-[10px] font-medium tabular-nums">
                      {shoots.length}
                    </span>
                  )}
                </button>
              );
            })}
          </LayoutGroup>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="calendar-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses, venues, crew..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md bg-[#F7F5F0] border border-[#E4DFD3] text-[#1A1917] placeholder-[#78716C] focus:outline-none focus:bg-white focus:border-[#0F6B5D]"
          />
        </div>
      </div>

      {/* Main 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start print:block print:w-full print:m-0 print:p-0">
        {/* Left Column: Chronological Shoot Schedule Cards (7 cols) */}
        <div className="print:hidden lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-medium text-[#57534E] uppercase tracking-wider tabular-nums">
              Scheduled Shoots ({filteredShoots.length})
            </h2>
          </div>

          {loading ? (
            <div className="bg-white border border-[#E4DFD3] rounded-lg p-12 text-center text-[#78716C] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#0F6B5D]" />
              <span className="text-xs">Loading schedule...</span>
            </div>
          ) : filteredShoots.length === 0 ? (
            <div className="bg-white border border-[#E4DFD3] rounded-lg p-12 text-center text-[#78716C] space-y-2">
              <Calendar className="w-8 h-8 text-[#D5CFC2] mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#1A1917]">
                  কোনো শুটিং শিডিউল পাওয়া যায়নি
                </p>
                <p className="text-xs text-[#78716C]">
                  No shoots scheduled for the selected window.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5" id="calendar-shoots-list">
              {filteredShoots.map((shoot) => {
                const isSelected = selectedShoot?.id === shoot.id;
                return (
                  <div
                    key={shoot.id}
                    id={`shoot-card-${shoot.id}`}
                    onClick={() => handleSelectShoot(shoot)}
                    className={`bg-white p-4 rounded-lg border cursor-pointer relative transition-colors group ${
                      isSelected
                        ? "border-[#0F6B5D] shadow-[0_1px_2px_rgba(26,25,23,0.06)]"
                        : "border-[#E4DFD3] hover:border-[#D5CFC2] hover:bg-[#FBF9F5]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E4DFD3]">
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="px-2 py-0.5 rounded bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] text-xs font-mono font-medium">
                          {shoot.shoot_date}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-mono text-[#57534E]">
                          <Clock className="w-3 h-3 text-[#78716C]" />
                          <span>{shoot.call_time}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {shoot.is_emergency_override && (
                          <span className="px-1.5 py-0.5 rounded bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-[10.5px] font-medium">
                            Override
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] text-[11px] font-medium">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              shoot.stage === "completed" ? "bg-[#0F6B5D]" : "bg-[#57534E]"
                            }`}
                          />
                          <span>{shoot.stage_label}</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-[#1A1917]">
                            {shoot.course_name}
                          </h3>
                          <p className="text-xs text-[#57534E]">
                            {shoot.program_type_label} • {shoot.format_duration}
                          </p>
                        </div>

                        <span className="px-1.5 py-0.5 rounded bg-[#EFECE4] border border-[#E4DFD3] text-[#57534E] text-[11px] font-mono tabular-nums shrink-0">
                          {shoot.course_code}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#57534E]">
                        <MapPin className="w-3.5 h-3.5 text-[#78716C] shrink-0" />
                        <span>{shoot.venue_name}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs pt-0.5">
                        <Users className="w-3.5 h-3.5 text-[#78716C] shrink-0" />
                        <div className="flex flex-wrap items-center gap-1.5">
                          {shoot.assignees.length > 0 ? (
                            shoot.assignees.map((member, idx) => {
                              const isLead = member.assignment_role === "lead";
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] text-[11px] font-medium"
                                >
                                  {member.full_name}
                                  {isLead && (
                                    <span className="text-[10px] text-[#0F6B5D]">Lead</span>
                                  )}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[#78716C] text-xs">
                              {shoot.lead_name !== "Unassigned"
                                ? `${shoot.lead_name} (Lead)`
                                : "Unassigned"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs pt-0.5">
                        <Camera className="w-3.5 h-3.5 text-[#78716C] shrink-0" />
                        <span className="text-[#57534E] text-[11px] truncate font-mono tabular-nums">
                          {shoot.gear_summary}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#E4DFD3] flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[#78716C] font-mono tabular-nums">
                        {shoot.slip.slip_number}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMobileSlip(shoot);
                          }}
                          className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0F6B5D] text-white text-xs font-medium"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View Slip</span>
                        </button>

                        <span
                          className={`hidden lg:inline-flex items-center gap-1 text-xs font-medium ${
                            isSelected ? "text-[#0F6B5D]" : "text-[#78716C] group-hover:text-[#1A1917]"
                          }`}
                        >
                          <span>{isSelected ? "Selected" : "Inspect slip"}</span>
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

        {/* Right Column: Formal Shoot Assignment Slip (5 cols) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-20 print:block print:w-full print:static print:m-0 print:p-0">
          <div className="space-y-2.5">
            <div className="print:hidden flex items-center justify-between px-0.5">
              <h2 className="text-xs font-medium text-[#57534E] uppercase tracking-wider">
                Assignment Slip
              </h2>
              {selectedShoot && (
                <span className="text-xs font-mono text-[#78716C] tabular-nums">
                  {selectedShoot.slip.slip_number}
                </span>
              )}
            </div>

            {selectedShoot ? (
              <div
                id="calendar-shoot-slip-panel"
                className="bg-white border border-[#E4DFD3] rounded-lg shadow-[0_1px_2px_rgba(26,25,23,0.04)] overflow-hidden relative print:p-8 print:m-0 print:border-[#E4DFD3] print:shadow-none print:w-full"
              >
                {/* Clean Institutional Header */}
                <div className="bg-white border-b border-[#E4DFD3] px-4 py-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-[#F7F5F0] border border-[#E4DFD3] p-1 shrink-0 flex items-center justify-center">
                      <Image
                        src="/images/assdi-logo.png"
                        alt="ASSDI Logo"
                        width={24}
                        height={24}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col leading-tight min-w-0">
                      <span className="font-semibold text-[13px] text-[#1A1917]">
                        ASSDI Media Department
                      </span>
                      <span className="text-[10.5px] text-[#78716C] truncate">
                        As-Sunnah Skill Development Institute
                      </span>
                    </div>
                  </div>
                  <span
                    id="calendar-slip-number-badge"
                    className="font-mono text-[11px] font-medium px-2 py-0.5 rounded bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] tabular-nums shrink-0"
                  >
                    <span className="sr-only">ASSDI MEDIA • SHOOT </span>SLIP {selectedShoot.slip.slip_number}
                  </span>
                </div>

                {/* Hairline Document Grid */}
                <div className="p-4 space-y-3.5 print:p-6 print:m-0">
                  <div className="border border-[#E4DFD3] rounded-lg divide-y divide-[#E4DFD3] overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#E4DFD3] bg-[#F7F5F0]">
                      <div className="p-3 min-w-0">
                        <div className="text-[10.5px] font-medium text-[#78716C] uppercase tracking-wider mb-0.5">
                          Course &amp; Format
                        </div>
                        <div
                          id="calendar-slip-course"
                          className="font-semibold text-xs sm:text-[13px] text-[#1A1917] leading-snug"
                        >
                          {selectedShoot.slip.course_title}
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="text-[10.5px] font-medium text-[#78716C] uppercase tracking-wider mb-0.5">
                          Call Time &amp; Date
                        </div>
                        <div
                          id="calendar-slip-calltime"
                          className="font-semibold text-xs sm:text-[13px] text-[#0F6B5D] font-mono tabular-nums"
                        >
                          {selectedShoot.slip.call_time_formatted}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#E4DFD3] bg-white">
                      <div className="p-3">
                        <div className="text-[10.5px] font-medium text-[#78716C] uppercase tracking-wider mb-0.5">
                          Venue
                        </div>
                        <div
                          id="calendar-slip-venue"
                          className="font-medium text-xs text-[#1A1917]"
                        >
                          {selectedShoot.slip.venue_name}
                        </div>
                      </div>

                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10.5px] font-medium text-[#78716C] uppercase tracking-wider">
                            Assigned Gear
                          </span>
                          <Link
                            href="/admin/gear"
                            className="print:hidden text-[10.5px] font-medium text-[#0F6B5D] hover:underline"
                          >
                            Edit Gear
                          </Link>
                        </div>
                        <div id="calendar-slip-gear-list">
                          {selectedShoot.slip.assigned_gear.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {selectedShoot.slip.assigned_gear.map((g, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EFECE4] border border-[#E4DFD3] text-[11px] font-medium text-[#1A1917]"
                                >
                                  <span>{g.name}</span>
                                  <span className="font-mono text-[10px] text-[#78716C] tabular-nums">
                                    {g.serial_number}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[#78716C] text-xs">No gear assigned</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-white">
                      <div className="text-[10.5px] font-medium text-[#78716C] uppercase tracking-wider mb-1.5">
                        Assigned Team &amp; Contacts
                      </div>
                      <div
                        id="calendar-slip-team-list"
                        className="divide-y divide-[#E4DFD3] border border-[#E4DFD3] rounded-md"
                      >
                        {selectedShoot.slip.team_members.length > 0 ? (
                          selectedShoot.slip.team_members.map((m, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs bg-white"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-medium text-[#1A1917] truncate">
                                  {m.name}
                                </span>
                                {m.is_lead && (
                                  <span className="px-1.5 py-0.2 rounded bg-[#EFECE4] text-[#1A1917] border border-[#E4DFD3] text-[10px] font-medium">
                                    Lead
                                  </span>
                                )}
                              </div>
                              <a
                                href={`tel:${m.phone.replace(/[^0-9+]/g, "")}`}
                                className="font-mono text-[11px] text-[#57534E] hover:text-[#0F6B5D] tabular-nums shrink-0"
                              >
                                {m.phone}
                              </a>
                            </div>
                          ))
                        ) : (
                          <div className="px-2.5 py-1.5 text-xs text-[#78716C]">
                            {selectedShoot.lead_name !== "Unassigned"
                              ? `${selectedShoot.lead_name} (${selectedShoot.lead_phone})`
                              : "No crew assigned"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-2 rounded-md bg-[#F7F5F0] border border-[#E4DFD3] text-[11.5px] text-[#57534E]">
                    শুটিং শুরুর অন্তত ১৫ মিনিট আগে ভেন্যুতে উপস্থিত হয়ে গিয়ার চেক-আউট ও ব্যাটারি/কার্ড যাচাই নিশ্চিত করুন।
                  </div>

                  {/* Actions */}
                  <div className="print:hidden pt-1 flex flex-col sm:flex-row gap-2">
                    <Link
                      href="/admin/gear"
                      id="calendar-edit-gear-btn"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#EFECE4] text-[#1A1917] text-xs font-medium border border-[#E4DFD3]"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#57534E]" />
                      <span>Edit Gear</span>
                    </Link>
                    <button
                      onClick={handlePrintSlip}
                      id="calendar-download-pdf-btn"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#EFECE4] text-[#1A1917] text-xs font-medium border border-[#E4DFD3]"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#57534E]" />
                      <span>Download PDF</span>
                    </button>

                    <a
                      href={selectedShoot.slip.whatsapp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      id="calendar-share-whatsapp-btn"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0F6B5D] hover:bg-[#0B554A] text-white text-xs font-medium"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share on WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#E4DFD3] rounded-lg p-12 text-center text-[#78716C]">
                <FileText className="w-7 h-7 text-[#D5CFC2] mx-auto mb-2" />
                <p className="text-xs">Select a shoot from the list to inspect its slip.</p>
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
