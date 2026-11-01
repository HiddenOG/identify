"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/lib/social-actions";

/** Marks notifications read once the page has been seen, then refreshes so the header bell clears. */
export function MarkRead({ unread }: { unread: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!unread) return;
    markNotificationsRead().then(() => router.refresh());
  }, [unread, router]);
  return null;
}
