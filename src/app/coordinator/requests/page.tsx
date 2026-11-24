import Link from "next/link";
import { FilePlus2, ExternalLink } from "lucide-react";

export default function CoordinatorRequestsPage() {
  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-5 md:p-6 border border-emerald-600/20 bg-white/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0F766E] text-xs font-semibold">
            <span>কোর্স কোঅর্ডিনেটর পোর্টাল • RAC বিভাগ</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
            কোর্স মিডিয়া রিকুইজিশন ট্র্যাকার
          </h1>
          <p className="text-xs text-slate-500">
            আপনার কোর্স হতে প্রেরিত সকল শুটিং রিকুইজিশনের রিয়েল-টাইম অগ্রগতি ও
            ফাইনাল গুগল ড্রাইভ ডেলিভারি লিংক।
          </p>
        </div>

        <Link
          href="/coordinator/new"
          id="coordinator-new-req-btn"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all duration-150 shrink-0"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>নতুন রিকুইজিশন দিন</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
        <button className="px-3 py-1.5 rounded-lg bg-[#0F766E] text-white font-semibold shadow-xs">
          সকল (৩)
        </button>
        <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">
          পেন্ডিং (১)
        </button>
        <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">
          অনুমোদিত (১)
        </button>
        <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">
          ডেলিভার্ড (১)
        </button>
      </div>

      {/* Sample Tracked Requisitions List */}
      <div className="space-y-3">
        {/* Card 1: Delivered */}
        <div className="glass-panel p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                Delivered (সম্পন্ন)
              </span>
              <span className="text-xs font-semibold text-slate-700">
                প্র্যাকটিক্যাল ল্যাব সেশন রিল
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">REQ-2026-003</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">তারিখ ও সময়</span>
              <span className="font-semibold text-slate-800">২৫ জানুয়ারি, ১০:০০ AM</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">ভেন্যু</span>
              <span className="font-semibold text-slate-800">Lab Room</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">ফরম্যাট ও অনুপাত</span>
              <span className="font-semibold text-slate-800">Reel (9:16 Vertical)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">ড্রাইভ ডেলিভারি লিংক</span>
              <a
                href="https://drive.google.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#0F766E] hover:underline font-semibold"
              >
                <span>ভিডিও ডাউনলোড</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Card 2: Approved / Shoot Assigned */}
        <div className="glass-panel p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                Approved (অনুমোদিত)
              </span>
              <span className="text-xs font-semibold text-slate-700">
                ইন্ডাস্ট্রি ভিজিটর পরিচিতি ভিডিও
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">REQ-2026-002</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">শুটিং তারিখ</span>
              <span className="font-semibold text-slate-800">২৮ জানুয়ারি, ০২:৩০ PM</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">ভেন্যু</span>
              <span className="font-semibold text-slate-800">50 Katha Campus</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">নির্ধারিত টিম</span>
              <span className="font-semibold text-slate-800">২ জন সদস্য ও ক্যামেরা</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">বর্তমান স্টেজ</span>
              <span className="font-semibold text-blue-700">Shoot Assigned</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
