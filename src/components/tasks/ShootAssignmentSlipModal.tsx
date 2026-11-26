"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Printer, Share2, Camera } from "lucide-react";
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A1917]/40 print:p-0 print:static print:bg-white print:block"
      id="shoot-slip-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={MODAL_TRANSITION}
        className="w-full max-w-xl bg-white border border-[#E4DFD3] rounded-lg shadow-[0_8px_24px_rgba(26,25,23,0.08)] overflow-hidden flex flex-col max-h-[92vh] print:max-w-none print:shadow-none print:border-[#E4DFD3] print:rounded-none print:max-h-none"
        id="shoot-assignment-slip-card"
      >
        {/* Formal Operational Document Header */}
        <div className="bg-white border-b border-[#E4DFD3] px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-[#F7F5F0] border border-[#E4DFD3] p-1 shrink-0 flex items-center justify-center">
              <Image
                src="/images/assdi-logo.png"
                alt="ASSDI Logo"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-semibold text-sm tracking-tight text-[#1A1917]">
                ASSDI Media Department
              </span>
              <span className="text-[11px] text-[#78716C] truncate mt-0.5">
                As-Sunnah Skill Development Institute
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              id="slip-number-badge"
              className="font-mono text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-[#1A1917] tabular-nums"
            >
              <span className="sr-only">ASSDI MEDIA • SHOOT </span>SLIP {slip.slip_number}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="print:hidden p-1.5 rounded-md text-[#78716C] hover:text-[#1A1917] hover:bg-[#EFECE4]"
              id="close-slip-modal-btn"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hairline Operational Document Grid */}
        <div className="p-5 overflow-y-auto space-y-4 print:p-6 print:m-0 print:overflow-visible">
          <div className="border border-[#E4DFD3] rounded-lg divide-y divide-[#E4DFD3] overflow-hidden">
            {/* Course & Call Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#E4DFD3] bg-[#F7F5F0]">
              <div className="p-3.5 min-w-0">
                <div className="text-[11px] font-medium text-[#78716C] uppercase tracking-wider mb-1">
                  Course &amp; Format
                </div>
                <div
                  id="slip-course-title"
                  className="font-semibold text-sm text-[#1A1917] leading-snug"
                >
                  {slip.course_title}
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-[11px] font-medium text-[#78716C] uppercase tracking-wider mb-1">
                  Call Time &amp; Date
                </div>
                <div
                  id="slip-call-time"
                  className="font-semibold text-sm text-[#0F6B5D] tabular-nums font-mono"
                >
                  {slip.call_time_formatted}
                </div>
              </div>
            </div>

            {/* Venue & Assigned Gear Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#E4DFD3] bg-white">
              <div className="p-3.5">
                <div className="text-[11px] font-medium text-[#78716C] uppercase tracking-wider mb-1">
                  Venue
                </div>
                <div id="slip-venue-name" className="font-medium text-[13px] text-[#1A1917]">
                  {slip.venue_name}
                </div>
              </div>

              <div className="p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-[#78716C] uppercase tracking-wider">
                    Assigned Gear
                  </span>
                  <Link
                    href="/admin/gear"
                    className="print:hidden text-[11px] font-medium text-[#0F6B5D] hover:underline"
                  >
                    Edit Gear
                  </Link>
                </div>
                <div id="slip-gear-list">
                  {slip.assigned_gear.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {slip.assigned_gear.map((gear, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#EFECE4] border border-[#E4DFD3] text-xs font-medium text-[#1A1917]"
                        >
                          <span>{gear.name}</span>
                          <span className="font-mono text-[11px] text-[#78716C] tabular-nums">
                            {gear.serial_number}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[#78716C]">No gear assigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* Assigned Team Table Section */}
            <div className="p-3.5 bg-white">
              <div className="text-[11px] font-medium text-[#78716C] uppercase tracking-wider mb-2">
                Assigned Team &amp; Contacts
              </div>
              <div id="slip-team-list" className="divide-y divide-[#E4DFD3] border border-[#E4DFD3] rounded-md">
                {slip.team_members.length > 0 ? (
                  slip.team_members.map((member, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-xs bg-white"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-[#1A1917] truncate">
                          {member.name}
                        </span>
                        {member.is_lead && (
                          <span className="px-1.5 py-0.5 rounded bg-[#EFECE4] text-[#1A1917] border border-[#E4DFD3] text-[10px] font-medium">
                            Lead
                          </span>
                        )}
                      </div>
                      <a
                        href={`tel:${member.phone.replace(/[^0-9+]/g, "")}`}
                        className="font-mono text-xs text-[#57534E] hover:text-[#0F6B5D] tabular-nums shrink-0"
                      >
                        {member.phone}
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-[#78716C]">No crew assigned</div>
                )}
              </div>
            </div>
          </div>

          {/* Operational Call-Time Note */}
          <div className="px-3.5 py-2.5 rounded-md bg-[#F7F5F0] border border-[#E4DFD3] text-xs text-[#57534E]">
            শুটিং শুরুর অন্তত ১৫ মিনিট আগে ভেন্যুতে উপস্থিত হয়ে গিয়ার চেক-আউট ও ব্যাটারি/কার্ড যাচাই নিশ্চিত করুন।
          </div>
        </div>

        {/* Footer Actions (Hidden on Print) */}
        <div className="print:hidden px-5 py-3.5 bg-[#F7F5F0] border-t border-[#E4DFD3] flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Link
            href="/admin/gear"
            id="slip-edit-gear-btn"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#EFECE4] text-[#1A1917] text-xs font-medium border border-[#E4DFD3]"
          >
            <Camera className="w-3.5 h-3.5 text-[#57534E]" />
            <span>Edit Gear</span>
          </Link>

          <button
            type="button"
            onClick={handlePrint}
            id="slip-download-pdf-btn"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#EFECE4] text-[#1A1917] text-xs font-medium border border-[#E4DFD3]"
          >
            <Printer className="w-3.5 h-3.5 text-[#57534E]" />
            <span>Download PDF</span>
          </button>

          <a
            href={slip.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            id="slip-share-whatsapp-btn"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F6B5D] hover:bg-[#0B554A] text-white text-xs font-medium"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share on WhatsApp</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
