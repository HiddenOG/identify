"use client";

/* eslint-disable @next/next/no-img-element -- previews come from other people's sites */
import { useState } from "react";

/**
 * A site's own sharing image, or (when it has none, or blocks us from showing it) the site's
 * name set large, so a card never shows a broken image.
 */
export function SiteImage({ src, host, className = "" }: { src: string | null; host: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className={`grid place-items-center bg-surface p-6 text-center font-serif text-3xl font-medium tracking-tight text-muted ${className}`}>
        {host}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className={`bg-surface object-cover object-top ${className}`}
    />
  );
}
