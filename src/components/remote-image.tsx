/* eslint-disable @next/next/no-img-element -- images from other hosts can't go through the optimizer */
import Image from "next/image";
import { supabaseUrl } from "@/lib/supabase/env";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  /** How wide the image renders, so the optimizer picks the right size (e.g. "(max-width: 768px) 100vw, 728px"). */
  sizes: string;
  /** Load first: for the main image above the fold. */
  priority?: boolean;
};

/** Our own Supabase Storage uploads: resized, WebP and edge-cached by Next. Anything else: a plain <img>. */
export function RemoteImage({ src, alt = "", className, sizes, priority }: Props) {
  const optimizable = Boolean(supabaseUrl) && src.startsWith(`${supabaseUrl}/storage/v1/object/public/`);
  if (!optimizable) return <img src={src} alt={alt} className={className} loading={priority ? "eager" : "lazy"} />;
  // width/height 0 + CSS sizing keeps the image's natural aspect ratio (or the aspect-* class).
  return <Image src={src} alt={alt} width={0} height={0} sizes={sizes} className={className} priority={priority} />;
}
