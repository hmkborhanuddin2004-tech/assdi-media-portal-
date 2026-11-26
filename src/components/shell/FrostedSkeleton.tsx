import React from "react";

/**
 * Clean institutional skeleton preserving layout height during route/data fetches.
 */
export function FrostedPageSkeleton() {
  return (
    <div
      className="space-y-5 w-full max-w-full animate-pulse"
      aria-busy="true"
      aria-label="Loading..."
    >
      {/* Flat Header Skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E4E4E7]">
        <div className="h-6 w-40 rounded-md bg-[#E4E4E7]" />
        <div className="h-8 w-32 rounded-lg bg-[#E4E4E7]" />
      </div>

      {/* 3 Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white border border-[#E4E4E7] rounded-lg p-4 space-y-3 min-h-[104px] flex flex-col justify-between"
          >
            <div className="h-3.5 w-28 rounded bg-[#F4F4F5]" />
            <div className="h-7 w-20 rounded bg-[#E4E4E7]" />
          </div>
        ))}
      </div>

      {/* Table Container Skeleton */}
      <div className="bg-white border border-[#E4E4E7] rounded-lg overflow-hidden">
        <div className="h-10 bg-[#FAFAFA] border-b border-[#E4E4E7] px-4 flex items-center justify-between">
          <div className="h-3.5 w-36 rounded bg-[#E4E4E7]" />
          <div className="h-3.5 w-20 rounded bg-[#F4F4F5]" />
        </div>
        <div className="divide-y divide-[#E4E4E7]">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-12 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#F4F4F5]" />
                <div className="h-3.5 w-44 rounded bg-[#F4F4F5]" />
              </div>
              <div className="h-5 w-20 rounded-md bg-[#F4F4F5]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
