"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { applyThemeChoice, readThemeChoice, THEME_CHOICES, THEME_KEY, type ThemeChoice } from "@/lib/theme";

const CHANGE_EVENT = "bf-theme-change";

/**
 * Keeps <html data-theme> right after hydration: re-applies the stored choice (React's dev remount
 * clears attributes the inline script set) and follows OS changes while the choice is "system".
 */
export function ThemeSync() {
  useLayoutEffect(() => applyThemeChoice(readThemeChoice()), []);

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readThemeChoice() === "system") applyThemeChoice("system");
    };
    const onOtherTab = (e: StorageEvent) => {
      if (e.key === THEME_KEY) applyThemeChoice(readThemeChoice());
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onOtherTab);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onOtherTab);
    };
  }, []);

  return null;
}

const LABELS: Record<ThemeChoice, string> = { light: "Light", dark: "Dark", system: "System" };

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange); // another tab changed it
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Light / Dark / System segmented control. */
export function AppearancePicker() {
  // "system" on the server; the stored choice once hydrated.
  const choice = useSyncExternalStore(subscribe, readThemeChoice, () => "system" as const);

  function choose(next: ThemeChoice) {
    try {
      if (next === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked: the choice still applies for this page view.
    }
    applyThemeChoice(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <div role="radiogroup" aria-label="Appearance" className="inline-flex rounded-full bg-surface p-0.5 text-xs">
      {THEME_CHOICES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={choice === c}
          onClick={() => choose(c)}
          className={`rounded-full px-3 py-1 transition ${choice === c ? "bg-background font-medium shadow-sm" : "text-muted hover:text-foreground"}`}
        >
          {LABELS[c]}
        </button>
      ))}
    </div>
  );
}
