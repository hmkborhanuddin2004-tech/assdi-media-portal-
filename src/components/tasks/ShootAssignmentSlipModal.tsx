"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Printer,
  Share2,
  MapPin,
  Camera,
  CheckCircle2,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { MODAL_TRANSITION } from "@/lib/motion";
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:static print:bg-white print:block"
      id="shoot-slip-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={MODAL_TRANSITION}
        className="w-full max-w-xl bg-white/60 backdrop-blur-2xl border border-white/85 rounded-2xl shadow-[0_16px_40px_rgba(11,50,60,0.10)] overflow-hidden flex flex-col max-h-[92vh] print:max-w-none print:shadow-none print:border-none print:rounded-none print:bg-white print:max-h-none"
        id="shoot-assignment-slip-card"
      >
        {/* Premium Executive Header Band */}
        <div className="bg-gradient-to-r from-[#0f766e] to-[#0b5a54] text-white px-5 py-4 flex items-center justify-between print:text-black print:bg-none print:border-b print:border-slate-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/95 p-1.5 shadow-sm shrink-0 flex items-center justify-center">
              <Image
                src="/images/assdi-logo.png"
                alt="ASSDI Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-extrabold text-base tracking-tight text-white print:text-black">
                ASSDI <span className="text-emerald-200 print:text-slate-800">Media</span>
              </span>
              <span className="text-[11px] text-white/85 print:text-slate-600 font-medium truncate">
                As-Sunnah Skill Development Institute • Media Dept.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              id="slip-number-badge"
              className="font-mono text-xs font-bold tracking-wider px-3 py-1 rounded-full bg-white/15 border border-white/25 backdrop-blur-md text-white shadow-xs print:text-black print:border-black print:bg-white"
            >
              <span className="sr-only">ASSDI MEDIA • SHOOT </span>SLIP {slip.slip_number}
            </span>
            <button
              onClick={onClose}
              className="print:hidden p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              id="close-slip-modal-btn"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Structured Luxury Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 print:p-6 print:m-0 print:overflow-visible">
          {/* Highlighted Top Summary Strip */}
          <div className="bg-white/55 border border-white/75 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs print:bg-slate-50 print:border-slate-200">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-[#33475f] uppercase tracking-wider mb-0.5">
                Course & Program Format
              </div>
              <div
                id="slip-course-title"
                className="font-extrabold text-sm sm:text-[15px] text-[#0b1f3a] leading-tight"
              >
                {slip.course_title}
              </div>
            </div>
            <div className="sm:text-right shrink-0">
              <div className="text-[10px] font-bold text-[#33475f] uppercase tracking-wider mb-0.5">
                Call Time + Date
              </div>
              <div
                id="slip-call-time"
                className="font-extrabold text-sm sm:text-[15px] text-[#0f766e] leading-tight font-mono"
              >
                {slip.call_time_formatted}
              </div>
            </div>
          </div>

          {/* Clean 2-Column Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Venue */}
            <div className="p-3.5 rounded-xl bg-white/50 border border-white/75 shadow-xs flex flex-col justify-between print:bg-white print:border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#33475f] uppercase tracking-wider mb-1.5">
                <span className="p-1 rounded-md bg-[#0f766e]/12 text-[#0f766e]">
                  <MapPin className="w-3.5 h-3.5" />
                </span>
                <span>Venue / ভেন্যু</span>
              </div>
              <div
                id="slip-venue-name"
                className="font-bold text-sm text-[#0b1f3a] leading-snug"
              >
                {slip.venue_name}
              </div>
            </div>

            {/* Assigned Gear */}
            <div className="p-3.5 rounded-xl bg-white/50 border border-white/75 shadow-xs flex flex-col justify-between print:bg-white print:border-slate-200">
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#33475f] uppercase tracking-wider">
                  <span className="p-1 rounded-md bg-[#0f766e]/12 text-[#0f766e]">
                    <Camera className="w-3.5 h-3.5" />
                  </span>
                  <span>Assigned Gear / গিয়ার</span>
                </div>
                <Link
                  href="/admin/gear"
                  className="print:hidden text-[11px] font-semibold text-[#0f766e] hover:underline"
                >
                  Edit Gear
                </Link>
              </div>
              <div id="slip-gear-list" className="space-y-1.5">
                {slip.assigned_gear.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {slip.assigned_gear.map((gear, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/[0.05] border border-slate-900/10 text-xs font-semibold text-[#0b1f3a] shadow-2xs print:border-slate-300"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e]" />
                        <span>{gear.name}</span>
                        <span className="font-mono text-[10.5px] text-[#33475f]">({gear.serial_number})</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-[#33475f]">
                    <span className="italic">কোনো গিয়ার বরাদ্দ নেই</span>
                    <Link
                      href="/admin/gear"
                      className="print:hidden text-[11px] font-bold text-[#0f766e] hover:underline"
                    >
                      গিয়ার বরাদ্দ করুন →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Assigned Team & Phones */}
          <div className="p-3.5 rounded-xl bg-white/50 border border-white/75 shadow-xs space-y-2.5 print:bg-white print:border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#33475f] uppercase tracking-wider">
              <span className="p-1 rounded-md bg-[#0f766e]/12 text-[#0f766e]">
                <Users className="w-3.5 h-3.5" />
              </span>
              <span>Assigned Team & Phones / শুট টিম</span>
            </div>
            <div id="slip-team-list" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {slip.team_members.length > 0 ? (
                slip.team_members.map((member, idx) => {
                  const initials = member.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/70 border border-white/85 shadow-2xs print:bg-white print:border-slate-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs print:bg-slate-700">
                          {initials}
                        </div>
                        <span className="font-semibold text-xs text-[#0b1f3a] truncate">
                          {member.name}
                        </span>
                        {member.is_lead && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#0f766e]/15 text-[#0b5a54] border border-[#0f766e]/25">
                            Lead
                          </span>
                        )}
                      </div>
                      <a
                        href={`tel:${member.phone.replace(/[^0-9+]/g, "")}`}
                        className="font-mono text-xs font-semibold text-[#0f766e] hover:underline shrink-0"
                      >
                        {member.phone}
                      </a>
                    </div>
                  );
                })
              ) : (
                <span className="text-slate-400 italic text-xs">কোনো টিম বরাদ্দ করা হয়নি</span>
              )}
            </div>
          </div>

          {/* Instruction Note */}
          <div className="p-3 rounded-xl bg-[#0f766e]/10 border border-[#0f766e]/20 text-xs text-[#0b5a54] flex items-center gap-2.5 font-medium shadow-2xs print:bg-slate-50 print:border-slate-300 print:text-black">
            <CheckCircle2 className="w-4 h-4 text-[#0f766e] shrink-0" />
            <span>
              শুটিং শুরুর অন্তত ১৫ মিনিট আগে ভেন্যুতে উপস্থিত হয়ে গিয়ার চেক-আউট ও ব্যাটারি/কার্ড যাচাই নিশ্চিত করুন।
            </span>
          </div>
        </div>

        {/* Modal Actions (Hidden on Print) */}
        <div className="print:hidden p-4 bg-white/50 border-t border-white/75 flex flex-col sm:flex-row gap-2.5 sm:justify-end">
          {/* Edit Gear Button */}
          <Link
            href="/admin/gear"
            id="slip-edit-gear-btn"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/70 hover:bg-white text-[#33475f] hover:text-[#0b1f3a] text-xs sm:text-sm font-semibold border border-white/80 transition-all shadow-xs hover:shadow-sm active:scale-[0.98]"
          >
            <Camera className="w-4 h-4 text-[#0f766e]" />
            <span>Edit Gear</span>
          </Link>

          {/* Download PDF / Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            id="slip-download-pdf-btn"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b1f3a] hover:bg-[#152a4a] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          {/* WhatsApp 1-Click Share Button */}
          <a
            href={slip.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            id="slip-share-whatsapp-btn"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f766e] hover:bg-[#0b5a54] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <Share2 className="w-4 h-4" />
            <span>Share on WhatsApp</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
