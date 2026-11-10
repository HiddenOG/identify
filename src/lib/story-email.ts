import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * "New on Identify": the email every member gets when Identify publishes a story they were told
 * about. Same look as the invite and auth emails (white card, logo, dark button).
 */

export type StoryEmail = { title: string; summary: string | null; coverUrl: string | null; url: string; author: string };

/** Where people turn these emails off. */
export const EMAIL_SETTINGS_URL = `${SITE_URL}/settings#emails`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function storySubject(story: StoryEmail) {
  return `New on ${SITE_NAME}: ${story.title}`;
}

export function storyHtml(story: StoryEmail, name: string) {
  const first = esc(name.trim().split(/\s+/)[0] || "there");
  // Gmail and Apple Mail show every cover type we store; Outlook desktop may skip a WebP one, and the rest still reads fine.
  const cover = story.coverUrl
    ? `<tr><td style="padding:20px 32px 0 32px;"><a href="${esc(story.url)}"><img src="${esc(story.coverUrl)}" width="456" alt="" style="display:block;width:100%;max-width:456px;height:auto;border:0;border-radius:12px;"></a></td></tr>`
    : "";
  return `<div style="background:#f4f5f7;padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;">
  <tr><td style="padding:32px 32px 0 32px;">
    <img src="${SITE_URL}/email/logo.png" width="44" height="44" alt="${SITE_NAME}" style="display:block;border:0;border-radius:10px;">
  </td></tr>
  <tr><td style="padding:24px 32px 0 32px;">
    <span style="display:inline-block;margin:0 0 14px 0;background:#a3ef6b;color:#111827;font-size:12px;font-weight:700;letter-spacing:0.06em;padding:6px 12px;border-radius:999px;font-family:${font};">&#10022; NEW ON ${SITE_NAME.toUpperCase()}</span>
    <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:#374151;font-family:${font};">Hi ${first}, ${esc(story.author)} just published a new story.</p>
    <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;font-weight:700;color:#111827;font-family:${font};"><a href="${esc(story.url)}" style="color:#111827;text-decoration:none;">${esc(story.title)}</a></h1>
    ${story.summary ? `<p style="margin:0;font-size:16px;line-height:1.6;color:#6b7280;font-family:${font};">${esc(story.summary)}</p>` : ""}
  </td></tr>
  ${cover}
  <tr><td style="padding:24px 32px 0 32px;">
    <a href="${esc(story.url)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:999px;font-family:${font};">Read the story</a>
  </td></tr>
  <tr><td style="padding:28px 32px 32px 32px;">
    <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;font-family:${font};">You get these because you&rsquo;re on ${SITE_NAME}. <a href="${EMAIL_SETTINGS_URL}" style="color:#9ca3af;">Turn off story emails</a> any time in Settings.</p>
  </td></tr>
</table>
</div>`;
}

export function storyText(story: StoryEmail, name: string) {
  const first = name.trim().split(/\s+/)[0] || "there";
  return [
    `Hi ${first}, ${story.author} just published a new story on ${SITE_NAME}.`,
    "",
    story.title,
    ...(story.summary ? [story.summary] : []),
    "",
    `Read it: ${story.url}`,
    "",
    `You get these because you're on ${SITE_NAME}. Turn off story emails in Settings: ${EMAIL_SETTINGS_URL}`,
  ].join("\n");
}
