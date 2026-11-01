"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export type ChartSeries = { name: string; color: string };
/** One x position. Null values (e.g. days still to come) leave a gap. */
export type ChartPoint = { tick: string; label: string; values: (number | null)[] };

type Props = {
  series: ChartSeries[];
  points: ChartPoint[];
  /** Show the x tick for every nth point (and the first). */
  tickEvery?: number;
  height?: number;
  caption: string;
};

const M = { top: 12, right: 16, bottom: 28, left: 36 };

/** Round the axis top up to 1, 2, 5 x 10^n so ticks are clean numbers. */
function niceScale(max: number) {
  if (max <= 0) return { top: 1, step: 1 };
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  const s = Math.max(1, step);
  return { top: Math.ceil(max / s) * s, step: s };
}

const fmt = (n: number) => new Intl.NumberFormat("en-US", { notation: n >= 1000 ? "compact" : "standard" }).format(n);

/**
 * A small line chart: 2px lines, hairline grid, legend for 2+ series, a crosshair tooltip that
 * snaps to the nearest x (pointer or arrow keys), and a table view so no value is hover-only.
 */
export function LineChart({ series, points, tickEvery = 1, height = 240, caption }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = width - M.left - M.right;
  const innerH = height - M.top - M.bottom;
  const max = Math.max(0, ...points.flatMap((p) => p.values.map((v) => v ?? 0)));
  const { top, step } = niceScale(max);
  const x = (i: number) => M.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => M.top + innerH - (v / top) * innerH;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  const path = (s: number) => {
    let d = "";
    let pen = false;
    points.forEach((p, i) => {
      const v = p.values[s];
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const lastIndex = points.findLastIndex((p) => p.values.some((v) => v !== null));

  const onPointer = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - box.left) / box.width;
    setActive(Math.max(0, Math.min(lastIndex, Math.round(rel * (points.length - 1)))));
  };
  const onKey = (e: KeyboardEvent<SVGRectElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setActive((a) => {
      const cur = a ?? lastIndex;
      return Math.max(0, Math.min(lastIndex, cur + (e.key === "ArrowRight" ? 1 : -1)));
    });
  };

  const tip = active !== null && active >= 0 ? points[active] : null;
  const tipLeft = active !== null ? Math.min(Math.max(x(active), 80), width - 80) : 0;

  return (
    <figure className="m-0">
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap justify-end gap-x-5 gap-y-1 text-sm text-muted" aria-label="Legend">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
      )}

      <div ref={wrap} className="relative">
        <svg width={width} height={height} role="img" aria-label={caption} className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {fmt(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i === 0 || i % tickEvery === 0 ? (
              <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
                {p.tick}
              </text>
            ) : null,
          )}

          {series.map((s, si) => (
            <path key={s.name} d={path(si)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}

          {/* End dots mark the latest value of each series. */}
          {lastIndex >= 0 &&
            active === null &&
            series.map((s, si) => {
              const v = points[lastIndex].values[si];
              return v === null ? null : (
                <circle key={s.name} cx={x(lastIndex)} cy={y(v)} r={4} fill={s.color} stroke="var(--background)" strokeWidth={2} />
              );
            })}

          {tip && active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + innerH} stroke="var(--chart-axis)" />
              {series.map((s, si) => {
                const v = tip.values[si];
                return v === null ? null : (
                  <circle key={s.name} cx={x(active)} cy={y(v)} r={4} fill={s.color} stroke="var(--background)" strokeWidth={2} />
                );
              })}
            </g>
          )}

          <rect
            x={M.left}
            y={M.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            tabIndex={0}
            aria-label={`${caption}. Use the left and right arrow keys to read values.`}
            className="cursor-crosshair outline-none focus-visible:stroke-foreground"
            onPointerMove={onPointer}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(lastIndex)}
            onBlur={() => setActive(null)}
            onKeyDown={onKey}
          />
        </svg>

        {tip && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 min-w-36 -translate-x-1/2 rounded-md border border-line bg-background px-3 py-2 text-sm shadow-lg"
            style={{ left: tipLeft }}
          >
            <p className="mb-1 text-xs text-muted">{tip.label}</p>
            {series.map((s, si) => (
              <p key={s.name} className="flex items-center gap-2">
                <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                <strong className="tabular-nums">{tip.values[si] ?? "–"}</strong>
                <span className="text-muted">{s.name}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-foreground">View as table</summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-muted">
              <tr>
                <th className="py-1 font-normal">Date</th>
                {series.map((s) => (
                  <th key={s.name} className="py-1 text-right font-normal">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.slice(0, lastIndex + 1).map((p) => (
                <tr key={p.label} className="border-t border-line">
                  <td className="py-1">{p.label}</td>
                  {p.values.map((v, i) => (
                    <td key={i} className="py-1 text-right">
                      {v ?? "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
