import React from "react";

/**
 * Reusable frosted-glass loading skeleton that preserves layout height
 * and renders subtle glassmorphism shimmer cards while route/data fetches complete.
 */
export function FrostedPageSkeleton() {
  return (
    <div
      className="space-y-4 w-full max-w-full animate-pulse"
      aria-busy="true"
      aria-label="লোড হচ্ছে..."
    >
      {/* Hero Banner Skeleton */}
      <div className="glass-emerald-card rounded-[18px] p-5 md:p-6 space-y-3">
        <div className="h-6 w-48 rounded-full bg-[#0f766e]/15" />
        <div className="h-7 w-72 max-w-full rounded-xl bg-slate-900/10" />
        <div className="h-4 w-96 max-w-full rounded-lg bg-slate-900/[0.06]" />
        <div className="pt-2 flex flex-wrap gap-2.5">
          <div className="h-9 w-36 rounded-xl bg-[#0f766e]/20" />
          <div className="h-9 w-32 rounded-xl bg-white/70 border border-white/80" />
        </div>
      </div>

      {/* 3 KPI Glass Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="glass-panel p-4 sm:p-5 space-y-3 min-h-[124px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-32 rounded bg-slate-900/10" />
              <div className="w-8 h-8 rounded-xl bg-[#0f766e]/15" />
            </div>
            <div className="space-y-2">
              <div className="h-7 w-24 rounded-lg bg-slate-900/12" />
              <div className="h-3 w-44 rounded bg-slate-900/[0.06]" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Glass Panel Skeleton */}
      <div className="glass-panel p-5 space-y-4 min-h-[340px]">
        <div className="flex items-center justify-between border-b border-white/60 pb-3">
          <div className="space-y-1.5">
            <div className="h-5 w-56 rounded-lg bg-slate-900/10" />
            <div className="h-3 w-40 rounded bg-slate-900/[0.06]" />
          </div>
          <div className="h-7 w-24 rounded-lg bg-white/65" />
        </div>
        <div className="space-y-3 pt-1">
          {[0, 1, 2, 3].map((row) => (
            <div
              key={row}
              className="h-14 rounded-xl bg-white/45 border border-white/75 flex items-center justify-between px-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0f766e]/15" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-40 rounded bg-slate-900/10" />
                  <div className="h-2.5 w-28 rounded bg-slate-900/[0.06]" />
                </div>
              </div>
              <div className="h-6 w-20 rounded-full bg-white/70" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
