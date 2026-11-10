"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import type { DashboardData } from "@/lib/dashboards/types";
import { DashboardSummary } from "./dashboard-summary";

// AG Studio is browser-only (canvas, charts, its own data engine) and large, so
// it's loaded on this page alone, never rendered on the server, and only on
// screens wide enough for it. Phones get a simple summary instead.
const StudioDashboard = dynamic(() => import("./studio-dashboard"), {
  ssr: false,
  loading: () => <p className="text-zinc-600 dark:text-zinc-400">Loading your dashboard…</p>,
});

const wideQuery = "(min-width: 768px)";
function subscribe(onChange: () => void) {
  const query = window.matchMedia(wideQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function DashboardLoader({ data, licenseKey }: { data: DashboardData; licenseKey: string | undefined }) {
  // null on the server: the screen size isn't known until the browser renders.
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia(wideQuery).matches, () => null);
  if (wide === null) return <p className="text-zinc-600 dark:text-zinc-400">Loading your dashboard…</p>;
  return wide ? <StudioDashboard data={data} licenseKey={licenseKey} /> : <DashboardSummary data={data} />;
}
