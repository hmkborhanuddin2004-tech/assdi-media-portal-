import Link from "next/link";
import {
  FilePlus2,
  Kanban,
  Camera,
  Calendar,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Flat Institutional Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2DDD2]">
        <div>
          <h1 className="text-xl sm:text-[22px] font-semibold text-[#1A1917] tracking-tight">
            আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট
          </h1>
          <p className="text-xs text-[#78716C] mt-0.5">
            ASSDI Central Media Management Portal
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/coordinator/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F6B5D] hover:bg-[#0B554A] text-white text-xs font-medium"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>New Requisition</span>
          </Link>
        </div>
      </div>

      {/* Overview Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="bg-white border border-[#E4DFD3] rounded-lg p-4 shadow-[0_1px_2px_rgba(26,25,23,0.04)] flex flex-col justify-between">
          <span className="text-xs font-medium text-[#78716C]">Today&apos;s Shoots</span>
          <div className="text-2xl font-semibold text-[#1A1917] mt-2 tabular-nums">3</div>
        </div>

        <div className="bg-white border border-[#E4DFD3] rounded-lg p-4 shadow-[0_1px_2px_rgba(26,25,23,0.04)] flex flex-col justify-between">
          <span className="text-xs font-medium text-[#78716C]">Pending Requests</span>
          <div className="text-2xl font-semibold text-[#1A1917] mt-2 tabular-nums">2</div>
        </div>

        <div className="bg-white border border-[#E4DFD3] rounded-lg p-4 shadow-[0_1px_2px_rgba(26,25,23,0.04)] flex flex-col justify-between">
          <span className="text-xs font-medium text-[#78716C]">In Post-Production</span>
          <div className="text-2xl font-semibold text-[#1A1917] mt-2 tabular-nums">5</div>
        </div>

        <div className="bg-white border border-[#E4DFD3] rounded-lg p-4 shadow-[0_1px_2px_rgba(26,25,23,0.04)] flex flex-col justify-between">
          <span className="text-xs font-medium text-[#78716C]">Available Gear</span>
          <div className="text-2xl font-semibold text-[#1A1917] mt-2 tabular-nums">12</div>
        </div>
      </div>

      {/* Core Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/coordinator/new"
          className="group bg-white border border-[#E4DFD3] hover:border-[#D4CFC2] rounded-lg p-5 shadow-[0_1px_2px_rgba(26,25,23,0.04)] flex flex-col justify-between"
        >
          <div className="space-y-2">
            <FilePlus2 className="w-4 h-4 text-[#0F6B5D]" />
            <h2 className="font-semibold text-sm text-[#1A1917]">Course Requisitions</h2>
            <p className="text-xs text-[#57534E]">
              Submit shoot requests with 3-day and 7-day lead-time enforcement.
            </p>
          </div>
          <div className="pt-3 flex items-center gap-1 text-xs font-medium text-[#0F6B5D]">
            <span>Open</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/admin/gear"
          className="group bg-white border border-[#E4DFD3] hover:border-[#D4CFC2] rounded-lg p-5 shadow-[0_1px_2px_rgba(26,25,23,0.04)] flex flex-col justify-between"
        >
          <div className="space-y-2">
            <Camera className="w-4 h-4 text-[#0F6B5D]" />
            <h2 className="font-semibold text-sm text-[#1A1917]">Gear Stock</h2>
            <p className="text-xs text-[#57534E]">
              Serialized equipment inventory with double-booking prevention.
            </p>
          </div>
          <div className="pt-3 flex items-center gap-1 text-xs font-medium text-[#0F6B5D]">
            <span>Open</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/admin/calendar"
          className="group bg-white border border-[#E4DFD3] hover:border-[#D4CFC2] rounded-lg p-5 shadow-[0_1px_2px_rgba(26,25,23,0.04)] flex flex-col justify-between"
        >
          <div className="space-y-2">
            <Calendar className="w-4 h-4 text-[#0F6B5D]" />
            <h2 className="font-semibold text-sm text-[#1A1917]">Master Calendar</h2>
            <p className="text-xs text-[#57534E]">
              Chronological shoot schedule with automated shoot assignment slips.
            </p>
          </div>
          <div className="pt-3 flex items-center gap-1 text-xs font-medium text-[#0F6B5D]">
            <span>Open</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      <div className="pt-2 flex items-center gap-2">
        <Link
          href="/admin/tasks"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E4DFD3] hover:bg-[#EFECE4] text-xs font-medium text-[#1A1917]"
        >
          <Kanban className="w-3.5 h-3.5 text-[#57534E]" />
          <span>Task Board</span>
        </Link>
      </div>
    </div>
  );
}
