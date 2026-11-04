import { ImageResponse } from "next/og";
import { clipText, OG, OG_CONTENT_TYPE, OG_SIZE, OgBrand, ogImage, ogOptions } from "@/lib/og";
import { getProject } from "@/lib/projects";
import { SITE_NAME } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

export const alt = `A project on ${SITE_NAME}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** A project's preview card: title, summary and author, with the cover image beside them. */
export default async function Image({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params;
  const project = hasSupabaseEnv ? await getProject(createPublicClient(), username, slug) : null;
  const title = project?.title ?? SITE_NAME;
  const author = project ? project.author.full_name || project.author.username : "";
  const [cover, avatar] = await Promise.all([ogImage(project?.cover_url), ogImage(project?.author.avatar_url)]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: OG.paper }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 56px 64px 80px", flex: 1 }}>
          <OgBrand />
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span style={{ fontSize: title.length > 40 ? 56 : 68, fontWeight: 700, lineHeight: 1.08, color: OG.ink }}>
              {clipText(title, cover ? 70 : 90)}
            </span>
            {project?.summary && <span style={{ fontSize: 28, color: OG.muted, lineHeight: 1.35 }}>{clipText(project.summary, cover ? 110 : 160)}</span>}
          </div>
          {author && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img>
                <img src={avatar} alt="" width={52} height={52} style={{ borderRadius: 999, objectFit: "cover", objectPosition: "top", background: "#f3f4f6" }} />
              ) : (
                <span style={{ display: "flex", width: 52, height: 52, borderRadius: 999, background: OG.lime, alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700 }}>
                  {author.charAt(0).toUpperCase()}
                </span>
              )}
              <span style={{ fontSize: 28, color: OG.ink }}>by {clipText(author, 40)}</span>
            </div>
          )}
        </div>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img>
          <img src={cover} alt="" style={{ width: 500, height: "100%", objectFit: "cover", objectPosition: "top" }} />
        )}
      </div>
    ),
    await ogOptions(),
  );
}
