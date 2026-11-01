"use client";

import { useEffect } from "react";
import { recordProjectEvent } from "@/lib/social-actions";

const READ_AFTER_MS = 30_000;

/**
 * Counts a view when the page opens and a read when the reader reaches the end marker
 * (or stays 30 seconds). Session storage avoids repeat calls; the database dedupes per day anyway.
 */
export function TrackView({ projectId, endMarkerId }: { projectId: string; endMarkerId: string }) {
  useEffect(() => {
    const once = (kind: "view" | "read") => {
      const key = `bf-${kind}-${projectId}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        // Storage blocked: still record; the database dedupes.
      }
      void recordProjectEvent(projectId, kind);
    };

    once("view");

    const timer = setTimeout(() => once("read"), READ_AFTER_MS);
    const marker = document.getElementById(endMarkerId);
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        once("read");
        observer.disconnect();
      }
    });
    if (marker) observer.observe(marker);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [projectId, endMarkerId]);

  return null;
}
