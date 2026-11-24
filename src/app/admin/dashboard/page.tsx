import Link from "next/link";
import {
  ShieldCheck,
  Users,
  Kanban,
  Camera,
  Calendar,
  ArrowRight,
  Sparkles,
  Clock,
} from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner */}
      <div className="glass-emerald-card rounded-2xl p-5 md:p-8 border border-emerald-600/20 shadow-sm relative overflow-hidden bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-[#0F766E] text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>মিডিয়া হেড ও কেন্দ্রীয় অ্যাডমিন ড্যাশবোর্ড • Media Head Control</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight leading-snug">
            সেন্ট্রাল মিডিয়া অ্যাডমিনিস্ট্রেশন হাব
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            আছ-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউটের সকল কোর্সের রিকুইজিশন
            অনুমোদন, গিয়ার বরাদ্দ, কেন্দ্রীয় টাস্ক বোর্ড ও ইউজার রোল ব্যবস্থাপনা।
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <Link
              href="/admin/users"
              id="admin-nav-users-btn"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all duration-150"
            >
              <Users className="w-4 h-4" />
              <span>ইউজার কন্ট্রোল ও অ্যাক্সেস</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/admin/tasks"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold border border-slate-200/90 shadow-xs transition-all duration-150"
            >
              <Kanban className="w-4 h-4 text-[#0F766E]" />
              <span>টাস্ক বোর্ড (৬-ধাপ)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        <div className="glass-panel rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-medium">পেন্ডিং রিকুইজিশন</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">২টি</span>
            <span className="text-[10px] text-amber-600 font-medium">রিভিউ আবশ্যক</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-medium">চলমান শুট</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-[#0F766E]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">৩টি</span>
            <span className="text-[10px] text-emerald-600 font-medium">মাঠে চলমান</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-medium">গিয়ার বরাদ্দ</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">৫টি</span>
            <span className="text-[10px] text-blue-600 font-medium">ইন ইউজ</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-medium">নিবন্ধিত ইউজার</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">৪টি রোল</span>
            <span className="text-[10px] text-purple-600 font-medium">সক্রিয়</span>
          </div>
        </div>
      </div>

      {/* Admin Modules Quick Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 tracking-tight">
          অ্যাডমিন ম্যানেজমেন্ট মডিউলসমূহ
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Link
            href="/admin/users"
            className="glass-panel p-4 rounded-xl border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-[#0F766E] group-hover:bg-[#0F766E] group-hover:text-white transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-[#0F766E]">
                  ইউজার ম্যানেজমেন্ট (/admin/users)
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  রোল ভিত্তিক অ্যাক্সেস কন্ট্রোল, কোর্স অ্যাসাইন ও ইউজার
                  অ্যাক্টিভেশন।
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/gear"
            className="glass-panel p-4 rounded-xl border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <Camera className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-sky-600">
                  ক্যামেরা ও গিয়ার স্টক
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  ১২টি ক্যামেরা বডি, ড্রোন, লেন্স ও জিম্বাল ইনভেন্টরি ট্র্যাকিং।
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/calendar"
            className="glass-panel p-4 rounded-xl border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                  মাস্টার ক্যালেন্ডার
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  আগামীকাল, ৩ দিন ও ৭ দিনের ক্রমানুসারে শুটিং সূচি।
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
