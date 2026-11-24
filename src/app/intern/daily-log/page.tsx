"use client";

import React, { useState } from "react";
import {
  Clock,
  MapPin,
  CheckCircle2,
  Sparkles,
  Save,
} from "lucide-react";

export default function InternDailyLogPage() {
  const [hours, setHours] = useState("4");
  const [locationType, setLocationType] = useState<"indoor" | "outdoor">("indoor");
  const [footageUploaded, setFootageUploaded] = useState(false);
  const [notes, setNotes] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-5 w-full max-w-full">
      {/* Top Banner (Mobile-First) */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-emerald-600/20 bg-white/80 shadow-sm space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ইন্টার্ন ও ট্রেইনি পোর্টাল • মোবাইল ফার্স্ট</span>
        </div>
        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
          দৈনিক কাজের লগ ও ফুটেজ স্ট্যাটাস
        </h1>
        <p className="text-xs text-slate-500">
          আজকের কাজের বিবরণ ও র-ফুটেজ ড্রাইভে আপলোড নিশ্চিত করুন। দুর্বল নেটওয়ার্কের
          জন্য ড্রাফট স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকে।
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />
          <span>দৈনিক লগ সফলভাবে সংরক্ষিত হয়েছে!</span>
        </div>
      )}

      {/* Intern Daily Log Form */}
      <form
        onSubmit={handleSubmit}
        className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 bg-white"
      >
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            কাজের সময়কাল (ঘণ্টা) <span className="text-slate-400">/ Hours Spent</span>
          </label>
          <div className="relative">
            <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="number"
              min="0.5"
              max="16"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            শুটিং লোকেশন টাইপ <span className="text-slate-400">/ Location Type</span>
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setLocationType("indoor")}
              className={`py-2.5 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                locationType === "indoor"
                  ? "bg-[#0F766E] text-white border-[#0F766E] shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>ইনডোর (Indoor)</span>
            </button>
            <button
              type="button"
              onClick={() => setLocationType("outdoor")}
              className={`py-2.5 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                locationType === "outdoor"
                  ? "bg-[#0F766E] text-white border-[#0F766E] shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>আউটডোর (Outdoor)</span>
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-800 block">
              র ফুটেজ গুগল ড্রাইভে আপলোড সম্পন্ন হয়েছে?
            </span>
            <span className="text-[11px] text-slate-500 block">
              টিক দিলে মূল টাস্ক বোর্ডে স্ট্যাটাস সিঙ্ক হবে
            </span>
          </div>
          <input
            type="checkbox"
            checked={footageUploaded}
            onChange={(e) => setFootageUploaded(e.target.checked)}
            className="w-5 h-5 rounded text-[#0F766E] focus:ring-[#0F766E] cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            মন্তব্য বা কাজের সংক্ষিপ্ত বিবরণ <span className="text-slate-400">/ Notes</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="আজকের ক্যামেরার অ্যাঙ্গেল, সাউন্ড ও শুটিংয়ের অভিজ্ঞতা..."
            className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>দৈনিক লগ সাবমিট করুন</span>
        </button>
      </form>
    </div>
  );
}
