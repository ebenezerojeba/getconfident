"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

const ChartSkeleton = () => <Skeleton className="h-[200px] w-full rounded-xl" />;

// Recharts is only needed after hydration; keep it out of the initial bundle.
export const TrendLine = dynamic(() => import("./charts").then((m) => m.TrendLine), {
  ssr: false,
  loading: ChartSkeleton,
});
export const TrendBars = dynamic(() => import("./charts").then((m) => m.TrendBars), {
  ssr: false,
  loading: ChartSkeleton,
});
