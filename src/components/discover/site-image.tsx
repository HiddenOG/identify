"use client";

/* eslint-disable @next/next/no-img-element -- images not yet copied to our storage come from other people's sites */
import { useState } from "react";
import Image from "next/image";
import { supabaseUrl } from "@/lib/supabase/env";

type Props = {
  src: string | null;
  host: string;
  className?: string;
  /** How wide the image renders, so the optimizer picks the right size. */
  sizes?: string;
  /** Load first: the main image above the fold. */
  priority?: boolean;
};

/**
 * A site's sharing image, or (when it has none, or it fails to load) the site's name set large,
 * so a card never shows a broken image. Copies in our storage are resized to WebP and cached.
 */
export function SiteImage({ src, host, className = "", sizes = "(max-width: 640px) 100vw, 480px", priority }: Props) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className={`grid place-items-center bg-surface p-6 text-center font-serif text-3xl font-medium tracking-tight text-muted ${className}`}>
        {host}
      </div>
    );
  }
  const classes = `bg-surface object-cover object-top ${className}`;
  if (supabaseUrl && src.startsWith(`${supabaseUrl}/storage/v1/object/public/`)) {
    return (
      <Image src={src} alt="" width={0} height={0} sizes={sizes} priority={priority} onError={() => setBroken(true)} className={classes} />
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading={priority ? "eager" : "lazy"}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className={classes}
    />
  );
}
