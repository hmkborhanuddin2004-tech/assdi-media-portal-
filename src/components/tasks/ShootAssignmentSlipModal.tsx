"use client";

import React from "react";
import Image from "next/image";
import {
  X,
  Printer,
  Share2,
  FileText,
  MapPin,
  Clock,
  Phone,
  Camera,
  CheckCircle2,
} from "lucide-react";
import type { ShootSlipData } from "@/lib/tasks/store";

interface ShootAssignmentSlipModalProps {
  slip: ShootSlipData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShootAssignmentSlipModal({
  slip,
  isOpen,
  onClose,
}: ShootAssignmentSlipModalProps) {
  if (!isOpen || !slip) return null;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      id="shoot-slip-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        id="shoot-assignment-slip-card"
      >
        {/* Modal Header (Hidden on Print) */}
        <div className="print:hidden px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-100 text-[#0F766E]">
              <FileText className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-800">
              Automated Shoot Assignment Slip
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            id="close-slip-modal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Slip Content */}
        <div className="p-6 overflow-y-auto space-y-5 bg-white print:p-8 print:m-0 print:shadow-none print:border-none print:w-full">
          {/* Slip Header Badge */}
          <div className="flex flex-col items-center text-center pb-2">
            <div className="w-12 h-12 mb-2 flex items-center justify-center">
              <Image
                src="/images/assdi-logo.png"
                alt="ASSDI Logo"
                width={48}
                height={48}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="inline-block border-2 border-dashed border-slate-800/80 px-4 py-1.5 rounded-lg">
              <span
                id="slip-number-badge"
                className="text-xs sm:text-sm font-extrabold tracking-widest uppercase text-slate-900"
              >
                ASSDI MEDIA • SHOOT SLIP {slip.slip_number}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
              As-Sunnah Skill Development Institute • Media Department
            </p>
          </div>

          {/* Details Table / Grid */}
          <div className="space-y-3.5 divide-y divide-slate-100 text-xs sm:text-sm">
            {/* Course */}
            <div className="flex items-start justify-between pt-2 gap-4">
              <div className="flex items-center gap-2 text-slate-500 shrink-0 font-medium">
                <FileText className="w-4 h-4 text-[#0F766E]" />
                <span>Course</span>
              </div>
              <span
                id="slip-course-title"
                className="font-bold text-slate-900 text-right"
              >
                {slip.course_title}
              </span>
            </div>

            {/* Venue */}
            <div className="flex items-start justify-between pt-3 gap-4">
              <div className="flex items-center gap-2 text-slate-500 shrink-0 font-medium">
                <MapPin className="w-4 h-4 text-[#0F766E]" />
                <span>Venue</span>
              </div>
              <span
                id="slip-venue-name"
                className="font-semibold text-slate-900 text-right"
              >
                {slip.venue_name}
              </span>
            </div>

            {/* Call Time */}
            <div className="flex items-start justify-between pt-3 gap-4">
              <div className="flex items-center gap-2 text-slate-500 shrink-0 font-medium">
                <Clock className="w-4 h-4 text-[#0F766E]" />
                <span>Call Time</span>
              </div>
              <span
                id="slip-call-time"
                className="font-bold text-[#0F766E] text-right"
              >
                {slip.call_time_formatted}
              </span>
            </div>

            {/* Team & Phones */}
            <div className="flex items-start justify-between pt-3 gap-4">
              <div className="flex items-center gap-2 text-slate-500 shrink-0 font-medium">
                <Phone className="w-4 h-4 text-[#0F766E]" />
                <span>Team & Phones</span>
              </div>
              <div className="space-y-1 text-right" id="slip-team-list">
                {slip.team_members.map((member, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-end gap-1.5 font-medium text-slate-800"
                  >
                    <span>{member.name}</span>
                    {member.is_lead && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-[#0F766E]">
                        Lead
                      </span>
                    )}
                    <span className="text-slate-400">•</span>
                    <span className="font-mono text-slate-700 font-semibold">
                      {member.phone}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned Gear */}
            <div className="flex items-start justify-between pt-3 gap-4">
              <div className="flex items-center gap-2 text-slate-500 shrink-0 font-medium">
                <Camera className="w-4 h-4 text-[#0F766E]" />
                <span>Assigned Gear</span>
              </div>
              <div className="space-y-1 text-right max-w-[65%]" id="slip-gear-list">
                {slip.assigned_gear.length > 0 ? (
                  slip.assigned_gear.map((gear, idx) => (
                    <div key={idx} className="text-slate-800 font-medium text-xs">
                      <span className="font-semibold">{gear.name}</span>{" "}
                      <span className="text-slate-500 text-[11px] font-mono">
                        ({gear.serial_number})
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 text-xs italic">কোনো গিয়ার বরাদ্দ নেই</span>
                )}
              </div>
            </div>
          </div>

          {/* Slip Footer Instructions */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              শুটিং শুরুর অন্তত ১৫ মিনিট আগে ভেন্যুতে উপস্থিত হয়ে গিয়ার চেক-ইন
              নিশ্চিত করুন।
            </span>
          </div>
        </div>

        {/* Modal Actions (Hidden on Print) */}
        <div className="print:hidden p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5 sm:justify-end">
          {/* Download PDF / Print Button */}
          <button
            onClick={handlePrint}
            id="slip-download-pdf-btn"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Download PDF / Print</span>
          </button>

          {/* WhatsApp 1-Click Share Button */}
          <a
            href={slip.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            id="slip-share-whatsapp-btn"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Share on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
