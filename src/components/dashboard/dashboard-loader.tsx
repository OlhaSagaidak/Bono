"use client";

import dynamic from "next/dynamic";
import type { DashboardData } from "@/lib/dashboards/types";

// AG Studio is browser-only (canvas, charts, its own data engine) and large, so
// it's loaded on this page alone and never rendered on the server.
const StudioDashboard = dynamic(() => import("./studio-dashboard"), {
  ssr: false,
  loading: () => <p className="text-zinc-600 dark:text-zinc-400">Loading your dashboard…</p>,
});

export function DashboardLoader({ data, licenseKey }: { data: DashboardData; licenseKey: string | undefined }) {
  return <StudioDashboard data={data} licenseKey={licenseKey} />;
}
