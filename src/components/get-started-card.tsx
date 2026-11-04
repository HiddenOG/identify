"use client";

/* eslint-disable @next/next/no-img-element -- the share-card preview is a generated PNG route */
import { useState } from "react";
import Link from "next/link";
import { GET_STARTED_COOKIE, setPreferenceCookie, SHARED_COOKIE } from "@/lib/get-started";

export type Step = { id: string; label: string; hint: string; href: string; done: boolean };

type Props = { firstName: string; username: string; url: string; cvFilled: boolean; steps: Step[] };

const Tick = ({ done }: { done: boolean }) => (
  <span
    className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs ${done ? "border-success bg-success text-background" : "border-line text-transparent"}`}
    aria-hidden
  >
    ✓
  </span>
);

/** The checklist itself; done states come from the server, sharing and dismissing are remembered in cookies. */
export function GetStartedCard({ firstName, username, url, cvFilled, steps: initial }: Props) {
  const [steps, setSteps] = useState(initial);
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const display = url.replace(/^https?:\/\//, "");

  function markShared() {
    setPreferenceCookie(SHARED_COOKIE, "1");
    setSteps((list) => list.map((s) => (s.id === "share" ? { ...s, done: true } : s)));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      markShared();
    } catch {
      window.prompt("Copy your link:", url);
    }
  }

  async function share() {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title: `${firstName}'s CV`, url });
      markShared();
    } catch {
      // Closed the share sheet; nothing to do.
    }
  }

  function dismiss() {
    setPreferenceCookie(GET_STARTED_COOKIE, "hidden");
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <section className="mb-10 rounded-2xl border border-line p-5 sm:p-6" aria-labelledby="get-started">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="get-started" className="text-xl font-bold">
            Welcome to Identify, {firstName} 👋
          </h2>
          <p className="mt-1 text-sm text-muted">A few steps to get the most out of your CV website.</p>
        </div>
        <button type="button" onClick={dismiss} className="shrink-0 text-sm text-muted hover:text-foreground">
          Hide
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}>
          <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
        <span className="shrink-0 text-xs text-muted">
          {done} of {steps.length} done
        </span>
      </div>

      <ol className="mt-4 divide-y divide-line">
        {steps.map((s) => {
          const current = s.id === next?.id;
          const body = (
            <>
              <Tick done={s.done} />
              <span className="min-w-0 flex-1">
                <span className={`block ${s.done ? "text-muted line-through" : "font-medium"}`}>{s.label}</span>
                {!s.done && <span className="block text-sm text-muted">{s.hint}</span>}
              </span>
              {!s.done && s.href && (
                <span className={`shrink-0 rounded-full px-3 py-1 text-sm ${current ? "bg-foreground text-background" : "border border-line"}`}>
                  {current ? "Start" : "Go"}
                </span>
              )}
            </>
          );
          return (
            <li key={s.id}>
              {s.href && !s.done ? (
                <Link href={s.href} className="flex items-center gap-3 py-3 hover:opacity-80">
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3 py-3">{body}</div>
              )}
            </li>
          );
        })}
      </ol>

      {/* The CV website they already have: link, copy/share, and how it looks when shared. */}
      {cvFilled && (
        <div className="mt-4 flex flex-col gap-4 rounded-xl bg-surface p-4 sm:flex-row sm:items-center">
          <img
            src={`/${username}/opengraph-image`}
            alt="How your link looks when shared"
            className="aspect-[1200/630] w-full shrink-0 rounded-lg border border-line object-cover sm:w-44"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Your CV website is live</p>
            <Link href={`/${username}`} className="block truncate text-sm text-muted hover:text-foreground hover:underline">
              {display}
            </Link>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={copy} className="rounded-full bg-foreground px-4 py-1.5 text-sm text-background hover:opacity-90">
                {copied ? "Copied ✓" : "Copy link"}
              </button>
              <button type="button" onClick={share} className="rounded-full border border-foreground px-4 py-1.5 text-sm hover:bg-background">
                Share
              </button>
            </div>
          </div>
        </div>
      )}
      {!cvFilled && steps.find((s) => s.id === "share" && !s.done) && (
        <p className="mt-3 text-sm text-muted">Your link to share will appear here once your CV has something in it.</p>
      )}
    </section>
  );
}
