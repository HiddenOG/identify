"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** A pill-shaped <select> that updates one search param (month or year). */
export function PeriodSelect({ param, value, options, label }: { param: string; value: string; options: { value: string; label: string }[]; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set(param, e.target.value);
          router.push(`${pathname}?${next}`, { scroll: false });
        }}
        className="appearance-none rounded-full border border-line bg-background py-2.5 pr-10 pl-5 text-sm hover:border-foreground"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-4 text-muted" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </label>
  );
}
