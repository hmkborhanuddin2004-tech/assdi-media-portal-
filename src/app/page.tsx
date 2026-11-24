import Link from "next/link";
import Image from "next/image";
import {
  Video,
  FilePlus2,
  Kanban,
  Camera,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-6 md:space-y-8 w-full max-w-full">
      {/* Top Hero / Welcome Banner */}
      <div className="glass-emerald-card rounded-2xl p-5 md:p-8 border border-emerald-600/20 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white p-2 border border-emerald-100 flex items-center justify-center shadow-md shadow-emerald-900/10 shrink-0">
              <Image
                src="/images/assdi-logo.png"
                alt="ASSDI Logo"
                width={48}
                height={48}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-[#0F766E] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>সেন্ট্রাল মিডিয়া অপারেশন হাব • ASSDI Portal v2.0</span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight leading-snug">
            আছ-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট
            <span className="block text-[#0F766E] mt-1">
              সেন্ট্রাল মিডিয়া ম্যানেজমেন্ট পোর্টাল
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            কোর্স রিকুইজিশন, গিয়ার ইনভেন্টরি, ৬-ধাপ সেন্ট্রাল টাস্ক বোর্ড ও দৈনিক
            কাজের লগ পরিচালনার সমন্বিত ডিজিটাল প্ল্যাটফর্ম।
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <Link
              href="/coordinator/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all duration-150"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>নতুন রিকুইজিশন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/admin/tasks"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold border border-slate-200/90 shadow-xs transition-all duration-150"
            >
              <Kanban className="w-4 h-4 text-[#0F766E]" />
              <span>টাস্ক বোর্ড</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI / Live Status Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        <div className="glass-panel rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-medium">আজকের শুট</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-[#0F766E]">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">৩টি</span>
            <span className="text-[10px] text-emerald-600 font-medium">নির্ধারিত</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-medium">পেন্ডিং রিকুইজিশন</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">২টি</span>
            <span className="text-[10px] text-amber-600 font-medium">রিভিউ আবশ্যক</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-medium">চলমান এডিটিং</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">৫টি</span>
            <span className="text-[10px] text-blue-600 font-medium">পোস্ট-প্রোডাকশন</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-medium">উপলব্ধ ক্যামেরা/গিয়ার</span>
            <div className="p-2 rounded-lg bg-teal-50 text-[#0F766E]">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">১২টি</span>
            <span className="text-[10px] text-teal-600 font-medium">রেডি টু ইউজ</span>
          </div>
        </div>
      </div>

      {/* Modules Quick Access Section */}
      <div className="space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
          <span>মডিউল এক্সেস ও ওয়ার্কফ্লো</span>
          <span className="text-xs font-normal text-slate-500">(Core Modules)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <Link
            href="/coordinator/new"
            className="group glass-panel rounded-xl p-4 sm:p-5 border border-slate-200/80 hover:border-[#0F766E]/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F766E] flex items-center justify-center group-hover:bg-[#0F766E] group-hover:text-white transition-colors">
                <FilePlus2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#0F766E] transition-colors">
                কোর্স রিকুইজিশন পোর্টাল
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2">
                ৯+ কোর্সের জন্য ৩ দিন ও ৭ দিনের লিড-টাইম নিয়মে রিকুইজিশন তৈরি ও লাইভ ট্র্যাকিং।
              </p>
            </div>
            <div className="pt-3 flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
              <span>রিকুইজিশন দিন</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/gear"
            className="group glass-panel rounded-xl p-4 sm:p-5 border border-slate-200/80 hover:border-[#0F766E]/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center group-hover:bg-[#0F766E] group-hover:text-white transition-colors">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#0F766E] transition-colors">
                গিয়ার ও ইকুইপমেন্ট স্টক
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2">
                সিরিয়াল নাম্বার সহ ক্যামেরা, ড্রোন, গিম্বল ও লাইটের ডাবল বুকিং লক এবং চেক-ইন/আউট।
              </p>
            </div>
            <div className="pt-3 flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
              <span>ইনভেন্টরি দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/calendar"
            className="group glass-panel rounded-xl p-4 sm:p-5 border border-slate-200/80 hover:border-[#0F766E]/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F766E] flex items-center justify-center group-hover:bg-[#0F766E] group-hover:text-white transition-colors">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#0F766E] transition-colors">
                মাস্টার শুট ক্যালেন্ডার
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2">
                আগামীকাল, পরবর্তী ৩ দিন ও ৭ দিনের সময়ানুক্রমিক শুট শিডিউল ও কল-টাইম ট্র্যাকিং।
              </p>
            </div>
            <div className="pt-3 flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
              <span>ক্যালেন্ডার খুলুন</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Institutional Quality Assurance Note */}
      <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-[#0F766E] shrink-0" />
        <p className="text-xs text-slate-600 leading-normal">
          <span className="font-semibold text-slate-800">
            আছ-সুন্নাহ ফাউন্ডেশন সিকিউরিটি ও পলিসি গ্যারান্টি:
          </span>{" "}
          সকল ডেটাবেজ এক্সেস Row Level Security (RLS) দ্বারা সংরক্ষিত। কোনো কোর্সের সমন্বয়ক অন্য কোর্সের তথ্য দেখতে পারবেন না।
        </p>
      </div>
    </div>
  );
}
