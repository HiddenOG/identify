import { LavaLamp, type LavaBlob } from "@/components/lava-lamp";
import { THEME_PRESETS } from "@/lib/themes";

const [lime, sky, coral, amber, violet] = Object.values(THEME_PRESETS).map((p) => p.accent);

// Big blobs on the right on tablets and desktops (clear of the headline); small ones in the corners on phones.
const BLOBS: LavaBlob[] = [
  { x: 74, y: 30, size: 190, color: lime, drift: 120, period: 26, screen: "md" },
  { x: 88, y: 55, size: 140, color: coral, drift: 150, period: 21, screen: "md" },
  { x: 66, y: 70, size: 120, color: sky, drift: 110, period: 30, screen: "md" },
  { x: 82, y: 12, size: 90, color: violet, drift: 90, period: 18, screen: "md" },
  { x: 92, y: 85, size: 160, color: amber, drift: 130, period: 34, screen: "md" },
  { x: 60, y: 20, size: 60, color: coral, drift: 80, period: 16, screen: "md" },
  { x: 70, y: 92, size: 80, color: lime, drift: 100, period: 24, screen: "md" },
  { x: 97, y: 30, size: 70, color: sky, drift: 70, period: 20, screen: "md" },
  { x: 52, y: 95, size: 50, color: violet, drift: 90, period: 28, screen: "md" },
  { x: 5, y: 92, size: 70, color: amber, drift: 60, period: 32, screen: "md" },
  { x: 86, y: 86, size: 80, color: lime, drift: 40, period: 22, screen: "sm" },
  { x: 72, y: 96, size: 50, color: coral, drift: 40, period: 18, screen: "sm" },
  { x: 97, y: 70, size: 44, color: sky, drift: 30, period: 26, screen: "sm" },
];

/** The landing hero's lava lamp, in the CV theme colors, with a little scroll parallax. */
export function HeroBalloons() {
  return <LavaLamp blobs={BLOBS} parallax={0.25} />;
}
