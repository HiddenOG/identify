import { SITE_NAME } from "@/lib/site";

/** The logo's green dot. A brand asset, so a fixed colour rather than a theme token. */
export const LOGO_GREEN = "#16a34a";

// Traced from "Identify Logo.pdf": an "i" stem with its dot, and a "d" whose bowl sits between
// the two stems. The bowl is clipped at the stems so the counter can be cut out with even-odd.
const STEM_I = "M547 182 625 169V531H547Z";
const STEM_D = "M769 186 847 169V531H769Z";
const BOWL =
  "M625 360A94 113 0 0 1 769 333V503A94 113 0 0 1 625 476Z" + "M679 418A31 50 0 1 0 741 418A31 50 0 1 0 679 418Z";

/** The "id" mark. Letters follow the text colour (so it works in light and dark); the dot stays green. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="540 78 312 456"
      height={size}
      width={(size * 312) / 456}
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <circle cx="586" cy="115" r="34" fill={LOGO_GREEN} />
      <path d={STEM_I} />
      <path d={STEM_D} />
      <path d={BOWL} fillRule="evenodd" />
    </svg>
  );
}

/** Mark + wordmark, as used in the header and editor bars. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-serif text-[1.55rem] leading-none font-bold tracking-tight">{SITE_NAME}</span>
    </span>
  );
}

/** The app-icon tile (favicon, home-screen icon): white mark on the dark tile, as in the PDF. */
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#111827"/><g transform="translate(256 262) scale(0.82) translate(-696 -306)" fill="#fff"><circle cx="586" cy="115" r="34" fill="${LOGO_GREEN}"/><path d="${STEM_I}"/><path d="${STEM_D}"/><path d="${BOWL}" fill-rule="evenodd"/></g></svg>`;
