import { ImageResponse } from "next/og";
import { OG, OG_CONTENT_TYPE, OG_SIZE, OgBrand, ogOptions } from "@/lib/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** The default preview card for any page that doesn't have its own. */
export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: OG.paper, position: "relative", overflow: "hidden" }}>
        {/* Lime blobs, echoing the lava lamp on the home page. */}
        <div style={{ position: "absolute", right: -120, top: -140, width: 520, height: 520, borderRadius: 999, background: OG.lime }} />
        <div style={{ position: "absolute", right: 220, bottom: -180, width: 360, height: 360, borderRadius: 999, background: OG.limeDeep, opacity: 0.55 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", width: "100%" }}>
          <OgBrand />
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 820 }}>
            <span style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.02, color: OG.ink }}>{SITE_TAGLINE.replace(/\.$/, "")}</span>
            <span style={{ fontSize: 34, color: OG.muted, lineHeight: 1.3 }}>
              Your own CV website, and the projects behind it, written up like stories.
            </span>
          </div>
        </div>
      </div>
    ),
    await ogOptions(),
  );
}
