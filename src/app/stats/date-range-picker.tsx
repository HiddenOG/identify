"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePopover } from "@/components/use-popover";
import { rangeLabel } from "@/lib/stats";

type Props = {
  /** The selected range and its limits, all "YYYY-MM-DD" in UTC (stats are kept in UTC days). */
  start: string;
  end: string;
  min: string;
  max: string;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function shift(day: string, days: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function shiftMonth(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

const fmt = (day: string, opts: Intl.DateTimeFormatOptions) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

/** Medium-style date picker for Stats: presets plus a calendar to pick any start and end day. */
export function DateRangePicker({ start, end, min, max }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { open, setOpen, root } = usePopover<HTMLDivElement>();
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState<string | null>(end);
  const [month, setMonth] = useState(end.slice(0, 7));

  const clamp = (day: string) => (day < min ? min : day > max ? max : day);
  const thisMonth = max.slice(0, 7);
  const presets: { label: string; range: [string, string] }[] = [
    { label: "Last 7 days", range: [shift(max, -6), max] },
    { label: "Last 30 days", range: [shift(max, -29), max] },
    { label: "This month", range: [`${thisMonth}-01`, max] },
    { label: "Last month", range: [`${shiftMonth(thisMonth, -1)}-01`, shift(`${thisMonth}-01`, -1)] },
    { label: "Last 3 months", range: [shift(max, -89), max] },
    { label: "This year", range: [`${max.slice(0, 4)}-01-01`, max] },
  ];

  function apply(a: string, b: string) {
    const [s, e] = [clamp(a), clamp(b)].sort();
    const next = new URLSearchParams(params);
    next.set("from", s);
    next.set("to", e);
    next.delete("month"); // the old month picker's param
    setOpen(false);
    router.push(`${pathname}?${next}`, { scroll: false });
  }

  function pick(day: string) {
    if (!to && day >= from) return setTo(day); // second click: the end
    if (!to && day < from) {
      setTo(from);
      return setFrom(day);
    }
    setFrom(day); // first click: a new start
    setTo(null);
  }

  // The grid for the month on show: leading blanks, then each day.
  const firstDay = `${month}-01`;
  const lead = new Date(`${firstDay}T00:00:00Z`).getUTCDay();
  const length = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const days = Array.from({ length }, (_, i) => shift(firstDay, i));
  const rangeEnd = to ?? from;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setFrom(start);
          setTo(end);
          setMonth(end.slice(0, 7));
          setOpen((o) => !o);
        }}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-background py-2.5 pr-4 pl-4 text-sm hover:border-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" />
        </svg>
        {rangeLabel(start, end)}
        <svg className="text-muted" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose dates"
          className="absolute right-0 z-40 mt-2 flex w-[min(92vw,34rem)] flex-col gap-4 rounded-xl border border-line bg-background p-4 shadow-[0_8px_30px_rgb(0_0_0/0.18)] sm:flex-row"
        >
          <ul className="flex shrink-0 flex-wrap gap-1 sm:w-36 sm:flex-col">
            {presets.map((p) => (
              <li key={p.label}>
                <button
                  type="button"
                  onClick={() => apply(...p.range)}
                  className="w-full rounded-md px-3 py-1.5 text-left text-sm text-muted hover:bg-surface hover:text-foreground"
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                disabled={month <= min.slice(0, 7)}
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
                className="grid size-8 place-items-center rounded-full hover:bg-surface disabled:opacity-30"
              >
                ‹
              </button>
              <span className="text-sm font-semibold">{fmt(firstDay, { month: "long", year: "numeric" })}</span>
              <button
                type="button"
                aria-label="Next month"
                disabled={month >= thisMonth}
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
                className="grid size-8 place-items-center rounded-full hover:bg-surface disabled:opacity-30"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-muted">
              {WEEKDAYS.map((d) => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
              {Array.from({ length: lead }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {days.map((day) => {
                const disabled = day < min || day > max;
                const isEdge = day === from || day === rangeEnd;
                const inside = day > from && day < rangeEnd;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(day)}
                    aria-pressed={isEdge || inside}
                    className={`mx-auto grid size-9 place-items-center rounded-full ${
                      isEdge ? "bg-foreground text-background" : inside ? "bg-surface" : "hover:bg-surface"
                    } disabled:text-muted/40 disabled:hover:bg-transparent`}
                  >
                    {Number(day.slice(8))}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="text-xs text-muted">{to ? rangeLabel(from, to) : "Pick an end date"}</span>
              <span className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-1.5 text-sm text-muted hover:text-foreground">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => apply(from, to ?? from)}
                  className="rounded-full bg-foreground px-4 py-1.5 text-sm text-background hover:opacity-90"
                >
                  Apply
                </button>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
