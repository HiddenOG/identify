"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Lava-lamp blobs that fill their parent (which must be `relative`). Each blob drifts on its own
 * (slow rise and sink), keeps changing shape, and melts into its neighbours where they touch
 * (SVG "goo" filter). The pointer (or a finger) pushes the wax aside; it then oozes back.
 * Animation runs only while the parent is on screen and is off for people who prefer reduced motion.
 */

// x/y: home position in % of the parent; size in px; drift: how far it wanders (px);
// period: seconds for one rise-and-sink; screen: "md" = tablet/desktop only, "sm" = phones only.
export type LavaBlob = { x: number; y: number; size: number; color: string; drift: number; period: number; screen?: "md" | "sm" };

type Props = {
  blobs: LavaBlob[];
  /** How far from the pointer the wax gets pushed (px). */
  pushRadius?: number;
  /** How much the blobs drift with page scroll (0 = none). */
  parallax?: number;
  /** Goo blur: higher melts blobs together sooner. */
  goo?: number;
};

const PUSH_FORCE = 1.6;
const SPRING = 0.008; // weak pull home: the wax oozes back
const DAMPING = 0.95; // thick, slow-moving

/** A glossy wax fill: lighter where the lamp's light hits it. */
const wax = (color: string) => `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${color} 55%, white), ${color} 55%)`;

export function LavaLamp({ blobs, pushRadius = 150, parallax = 0, goo = 14 }: Props) {
  const root = useRef<HTMLDivElement>(null);
  // Each lamp needs its own filter id (two can be on one page).
  const filterId = `lava-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    const container = root.current;
    const host = container?.parentElement;
    if (!container || !host) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = [...container.querySelectorAll<HTMLElement>("[data-blob]")];
    const state = blobs.map(() => ({
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
      seed: [0, 1, 2, 3, 4].map(() => Math.random() * Math.PI * 2),
    }));
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    let visible = true;

    const toLocal = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      pointer = toLocal(e);
    };
    const onLeave = () => {
      pointer = null;
    };
    // A tap or click gives the wax a stronger shove, like poking the lamp.
    const onDown = (e: PointerEvent) => {
      const p = toLocal(e);
      els.forEach((el, i) => {
        const b = blobs[i];
        const s = state[i];
        const dx = el.offsetLeft + b.size / 2 + s.ox - p.x;
        const dy = el.offsetTop + b.size / 2 + s.oy - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < pushRadius * 2) {
          s.vx += (dx / dist) * 9;
          s.vy += (dy / dist) * 9;
        }
      });
    };

    const tick = (now: number) => {
      const t = now / 1000;
      const scrolled = parallax ? -host.getBoundingClientRect().top : 0;

      els.forEach((el, i) => {
        const b = blobs[i];
        const s = state[i];
        const w = (Math.PI * 2) / b.period;

        // Wandering path: mostly up and down like rising wax, with a slow sideways sway.
        const wx = Math.sin(t * w * 0.7 + s.seed[0]) * b.drift * 0.45 + Math.sin(t * w * 1.9 + s.seed[1]) * b.drift * 0.15;
        const wy = Math.sin(t * w + s.seed[2]) * b.drift + Math.sin(t * w * 2.3 + s.seed[3]) * b.drift * 0.2;
        const lift = -scrolled * parallax;

        if (pointer) {
          const cx = el.offsetLeft + b.size / 2 + wx + s.ox;
          const cy = el.offsetTop + b.size / 2 + wy + s.oy + lift;
          const dx = cx - pointer.x;
          const dy = cy - pointer.y;
          const dist = Math.hypot(dx, dy) || 1;
          const reach = pushRadius + b.size / 2;
          if (dist < reach) {
            const push = ((reach - dist) / reach) * PUSH_FORCE;
            s.vx += (dx / dist) * push;
            s.vy += (dy / dist) * push;
          }
        }

        s.vx = (s.vx - s.ox * SPRING) * DAMPING;
        s.vy = (s.vy - s.oy * SPRING) * DAMPING;
        s.ox += s.vx;
        s.oy += s.vy;

        // Squash in the direction it is being pushed, and keep the outline wobbling.
        const speed = Math.min(Math.hypot(s.vx, s.vy) / 12, 0.25);
        const r = (k: number) => 50 + Math.sin(t * w * 2 + s.seed[4] + k * 1.7) * 12;
        el.style.borderRadius = `${r(0)}% ${r(1)}% ${r(2)}% ${r(3)}% / ${r(4)}% ${r(5)}% ${r(6)}% ${r(7)}%`;
        el.style.transform = `translate3d(${wx + s.ox}px, ${wy + s.oy + lift}px, 0) scale(${1 + speed}, ${1 - speed * 0.6})`;
      });

      if (visible) frame = requestAnimationFrame(tick);
    };

    // Only animate while the lamp is on screen.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible) frame = requestAnimationFrame(tick);
    });
    observer.observe(host);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
    };
  }, [blobs, pushRadius, parallax]);

  return (
    <div ref={root} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Blur, then sharpen the alpha: overlapping blobs melt into one shape. */}
      <svg width="0" height="0" className="absolute">
        <filter id={filterId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation={goo} result="blur" />
          <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" />
        </filter>
      </svg>
      <div className="absolute inset-0" style={{ filter: `url(#${filterId})` }}>
        {blobs.map((b, i) => (
          <span
            key={i}
            data-blob
            className={`absolute rounded-full will-change-transform ${b.screen === "md" ? "hidden md:block" : b.screen === "sm" ? "md:hidden" : ""}`}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.size,
              height: b.size,
              marginLeft: -b.size / 2,
              marginTop: -b.size / 2,
              background: wax(b.color),
            }}
          />
        ))}
      </div>
    </div>
  );
}
