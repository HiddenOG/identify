"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { usePathname } from "next/navigation";

/**
 * Open/close state for a header dropdown: closes on outside click, Escape, or navigation.
 * `also` is another element that counts as inside (e.g. a full-screen sheet rendered in a portal).
 */
export function usePopover<T extends HTMLElement>(also?: RefObject<HTMLElement | null>) {
  const [open, setOpen] = useState(false);
  const root = useRef<T>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Close when navigating (adjusting state during render, not in an effect).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!root.current?.contains(target) && !also?.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, also]);

  return { open, setOpen, root };
}
