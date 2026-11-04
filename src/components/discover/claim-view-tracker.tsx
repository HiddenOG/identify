"use client";

import { useEffect } from "react";
import { recordClaimView } from "@/lib/discover/actions";

/** Tells Discover admin that this listing's claim link was opened (once per page load). */
export function ClaimViewTracker({ portfolioId }: { portfolioId: string }) {
  useEffect(() => {
    void recordClaimView(portfolioId);
  }, [portfolioId]);
  return null;
}
