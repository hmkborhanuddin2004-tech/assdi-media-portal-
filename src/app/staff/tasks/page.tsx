import Link from "next/link";
import {
  Kanban,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";

export default function StaffTasksPage() {
  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-5 md:p-6 border border-emerald-600/20 bg-white/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
            <Kanban className="w-3.5 h-3.5" />
            <span>পার্মানেন্ট স্টাফ পোর্টাল • টাস্ক এক্সিকিউশন</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
            নির্ধারিত শুটিং ও পোস্ট-প্রোডাকশন টাস্ক
          </h1>
          <p className="text-xs text-slate-500">
            আপনার দায়িত্বে থাকা প্রজেক্টের স্টেজ আপডেট করুন এবং দৈনিক কাজের লগ
            লিপিবদ্ধ করুন।
          </p>
        </div>

        <Link
          href="/staff/daily-log"
          id="staff-daily-log-btn"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all duration-150 shrink-0"
        >
          <FileText className="w-4 h-4" />
          <span>দৈনিক লগ লিখুন</span>
        </Link>
      </div>

      {/* Active Assigned Tasks */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800">চলমান টাস্ক তালিকা</h2>

        <div className="glass-panel p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                Editing (এডিটিং চলমান)
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                মোবাইল সার্ভিসিং কোর্স ডক্যুমেন্টারি
              </span>
            </div>
            <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>ডেডলাইন: ২৪ ঘণ্টা বাকি</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">কোর্স</span>
              <span className="font-semibold text-slate-800">Mobile Servicing</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">টিম লিড</span>
              <span className="font-semibold text-slate-800">তারিকুল ইসলাম</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">র ফুটেজ আপলোড</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>আপলোডেড</span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">অ্যাসাইন করা গিয়ার</span>
              <span className="font-semibold text-slate-800">Sony FX3 (SN-FX3-01)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
