import { ImageResponse } from "next/og";
import { clipText, OG, OG_CONTENT_TYPE, OG_SIZE, OgBrand, ogImage, ogOptions } from "@/lib/og";
import { getProfileByUsername } from "@/lib/profiles";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

export const alt = `A CV on ${SITE_NAME}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** A person's preview card: name, headline, location, and their cut-out photo on the brand lime. */
export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = hasSupabaseEnv ? await getProfileByUsername(createPublicClient(), username) : null;
  const name = profile ? profile.view.fullName || profile.view.username : SITE_NAME;
  const headline = profile?.view.headline ?? "";
  const location = profile?.view.location ?? "";
  const photo = await ogImage(profile?.view.avatarUrl);
  const host = new URL(SITE_URL).host;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: OG.paper }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 64px 80px", flex: 1 }}>
          <OgBrand caption={`${host}/${username}`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingRight: 40 }}>
            {profile?.view.openToWork && (
              <span
                style={{ display: "flex", alignSelf: "flex-start", fontSize: 22, fontWeight: 700, color: OG.ink, background: OG.lime, padding: "8px 18px", borderRadius: 999 }}
              >
                OPEN TO WORK
              </span>
            )}
            <span style={{ fontSize: name.length > 22 ? 64 : 80, fontWeight: 700, lineHeight: 1.02, color: OG.ink }}>{clipText(name, 40)}</span>
            {headline && <span style={{ fontSize: 36, color: OG.ink, lineHeight: 1.25 }}>{clipText(headline, 70)}</span>}
            {location && <span style={{ fontSize: 28, color: OG.muted }}>{clipText(location, 50)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", width: 440, height: "100%", background: OG.lime, alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img>
            <img src={photo} alt="" style={{ width: 420, height: 560, objectFit: "contain", objectPosition: "bottom" }} />
          ) : (
            <span style={{ display: "flex", alignSelf: "center", fontSize: 200, fontWeight: 700, color: OG.ink }}>{name.charAt(0).toUpperCase()}</span>
          )}
        </div>
      </div>
    ),
    await ogOptions(),
  );
}
