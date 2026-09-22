"use client";

import React from "react";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`relative overflow-hidden bg-slate-800/60 rounded-lg before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-slate-700/30 before:to-transparent ${className}`}
    />
  );
}

export function CardSkeleton({ count = 1, className = "" }: { count?: number; className?: string }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`p-5 rounded-2xl bg-[#0D1322]/80 border border-slate-800 space-y-3 ${className}`}
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
      ))}
    </>
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-4 py-4 animate-pulse">
      <div className="flex items-start gap-3">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-3/4 rounded-xl" />
        </div>
      </div>
      <div className="flex items-start gap-3 flex-row-reverse">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <div className="space-y-2 flex-1 flex flex-col items-end">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-16 w-2/3 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3 p-4 rounded-xl bg-[#0D1322]/60 border border-slate-800">
      <div className="flex gap-4 pb-2 border-b border-slate-800">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-1.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-5 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

