"use client";

import { useEffect, useRef } from "react";

// Measures how long each post in the feed is actually on screen: at least half
// of it visible, while the tab is in the foreground. Totals go to the server
// in small batches (every 10 s, and when the page is hidden or closed) via
// navigator.sendBeacon, which survives the page unloading.
// The feed uses long looks as a signal of interest (lib/feed).

const FLUSH_EVERY_MS = 10_000;
const MAX_MS_PER_BATCH = 60_000; // the server caps it too

export function DwellTracker({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;

    const onScreen = new Set<string>(); // at least half visible right now
    const since = new Map<string, number>(); // counting since (while the tab is visible)
    const pending = new Map<string, number>(); // ms not yet sent

    const now = () => performance.now();
    const tabVisible = () => document.visibilityState === "visible";
    const stopCounting = (id: string, t: number) => {
      const start = since.get(id);
      if (start !== undefined) pending.set(id, (pending.get(id) ?? 0) + (t - start));
      since.delete(id);
    };

    function flush() {
      const t = now();
      for (const id of [...since.keys()]) {
        stopCounting(id, t);
        if (tabVisible()) since.set(id, t); // keep counting from here
      }
      const batch = [...pending]
        .map(([postId, ms]) => ({ postId, ms: Math.min(MAX_MS_PER_BATCH, Math.round(ms)) }))
        .filter((e) => e.ms >= 250); // a post scrolled straight past isn't a look
      pending.clear();
      if (batch.length === 0) return;
      const body = JSON.stringify(batch);
      if (!navigator.sendBeacon?.("/api/feed/dwell", new Blob([body], { type: "application/json" }))) {
        void fetch("/api/feed/dwell", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const t = now();
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.postId;
          if (!id) continue;
          if (entry.isIntersecting) {
            onScreen.add(id);
            if (tabVisible() && !since.has(id)) since.set(id, t);
          } else {
            onScreen.delete(id);
            stopCounting(id, t);
          }
        }
      },
      { threshold: 0.5 },
    );
    root.querySelectorAll<HTMLElement>("[data-post-id]").forEach((el) => observer.observe(el));

    const onVisibility = () => {
      if (tabVisible()) {
        const t = now();
        for (const id of onScreen) since.set(id, t);
      } else {
        flush(); // counts what was visible, then stops: nothing is counted while hidden
        since.clear();
      }
    };
    const interval = setInterval(flush, FLUSH_EVERY_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      clearInterval(interval);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
