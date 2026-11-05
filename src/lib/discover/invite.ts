import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * The Discover outreach email, as designed HTML (same look as the auth emails in
 * supabase/templates) plus a plain-text version. The admin page copies it for one listing and
 * the owner pastes it into Gmail. The highlighted line is for a personal compliment.
 */

export type InviteDetails = {
  name: string;
  host: string;
  categoryLabel: string;
  categoryUrl: string;
  claimUrl: string;
  removeUrl: string;
  sender: string;
  /** A published Discoveries feature about them; the email then leads with it. */
  feature?: { title: string; url: string };
};

/** Shown highlighted in the email so it isn't sent without being replaced. */
export const COMPLIMENT_PLACEHOLDER = "[One specific thing you liked about their work: replace this line]";

export function inviteSubject(name: string, featured = false) {
  return featured
    ? `${firstName(name)}, we wrote about your work on ${SITE_NAME}`
    : `${firstName(name)}, you've been chosen to be featured on ${SITE_NAME}`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const p = (html: string) => `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#374151;font-family:${font};">${html}</p>`;

export function inviteHtml(d: InviteDetails) {
  const first = esc(firstName(d.name));
  const link = (href: string, text: string) => `<a href="${esc(href)}" style="color:#111827;">${esc(text)}</a>`;
  const button = (href: string, text: string, primary: boolean) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;background:${primary ? "#111827" : "#ffffff"};color:${primary ? "#ffffff" : "#111827"};border:2px solid #111827;text-decoration:none;font-size:16px;font-weight:600;padding:12px 26px;border-radius:999px;font-family:${font};">${esc(text)}</a>`;
  const f = d.feature;
  const badge = f ? "&#10022; FEATURED IN IDENTIFY DISCOVERIES" : "&#10022; SELECTED FOR DISCOVER";
  const heading = f ? `${first}, we wrote about your work on ${SITE_NAME}` : `${first}, you&rsquo;ve been chosen to be featured on ${SITE_NAME}`;
  const intro = f
    ? [
        p(`I'm ${esc(d.sender)}, and I'm building ${link(SITE_URL, SITE_NAME)}, a place where people's work speaks for them, starting with talent here in Nigeria. In Discoveries, we find great work on the internet and tell the story behind it.`),
        p(`I came across ${link(`https://${d.host}`, d.host)} and <span style="background:#fef08a;">${esc(COMPLIMENT_PLACEHOLDER)}</span> So we wrote about it: ${link(f.url, f.title)}. It credits you and links straight to your site.`),
        p(`You&rsquo;re also listed under ${link(d.categoryUrl, d.categoryLabel)}, and that listing is yours to claim, for free. Claiming it turns it into your own ${SITE_NAME} profile: a CV website at <strong>${esc(new URL(SITE_URL).host)}/yourname</strong>, the feature linked to it, and a place to write up your own projects.`),
      ].join("\n    ")
    : [
        p(`I'm ${esc(d.sender)}, and I'm building ${link(SITE_URL, SITE_NAME)}, a place where people's work speaks for them, starting with talent here in Nigeria. We hand-pick every portfolio on our Discover page, and yours made the cut.`),
        p(`I came across ${link(`https://${d.host}`, d.host)} and <span style="background:#fef08a;">${esc(COMPLIMENT_PLACEHOLDER)}</span> You&rsquo;re now featured under ${link(d.categoryUrl, d.categoryLabel)}.`),
        p(`The listing only shows your name, your role and a link to your site. It&rsquo;s yours to claim, for free. Claiming it turns it into your own ${SITE_NAME} profile: a CV website at <strong>${esc(new URL(SITE_URL).host)}/yourname</strong>, a place to write up your projects, and a way for recruiters to find you by skill.`),
      ].join("\n    ");
  const buttons = f ? button(f.url, "Read the feature", true) + button(d.claimUrl, "Claim your profile", false) : button(d.claimUrl, "Claim your profile", true);
  return `<div style="background:#f4f5f7;padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;">
  <tr><td style="padding:32px 32px 0 32px;">
    <img src="${SITE_URL}/email/logo.png" width="44" height="44" alt="${SITE_NAME}" style="display:block;border:0;border-radius:10px;">
  </td></tr>
  <tr><td style="padding:24px 32px 0 32px;">
    <span style="display:inline-block;margin:0 0 14px 0;background:#a3ef6b;color:#111827;font-size:12px;font-weight:700;letter-spacing:0.06em;padding:6px 12px;border-radius:999px;font-family:${font};">${badge}</span>
    <h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.25;font-weight:700;color:#111827;font-family:${font};">${heading}</h1>
    ${intro}
  </td></tr>
  <tr><td style="padding:8px 32px 0 32px;">
    ${buttons}
  </td></tr>
  <tr><td style="padding:28px 32px 32px 32px;">
    ${p(`Either way, keep building great things.`)}
    <p style="margin:0;font-size:16px;line-height:1.5;color:#111827;font-family:${font};"><strong>${esc(d.sender)}</strong><br><span style="color:#6b7280;">Founder, ${SITE_NAME} &middot; ${link(SITE_URL, new URL(SITE_URL).host)}</span></p>
    <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#9ca3af;font-family:${font};">Rather not be listed? ${`<a href="${esc(d.removeUrl)}" style="color:#9ca3af;">Remove your listing</a>`}${f ? " (the feature comes down with it)" : ""}. It comes down straight away, no account needed, and we won&rsquo;t email you again.</p>
  </td></tr>
</table>
</div>`;
}

export function inviteText(d: InviteDetails) {
  const f = d.feature;
  if (f) {
    return [
      `${firstName(d.name)}, we wrote about your work on ${SITE_NAME}.`,
      "",
      `I'm ${d.sender}, and I'm building ${SITE_NAME} (${SITE_URL}), a place where people's work speaks for them, starting with talent here in Nigeria. In Discoveries, we find great work on the internet and tell the story behind it.`,
      "",
      `I came across ${d.host} and ${COMPLIMENT_PLACEHOLDER} So we wrote about it: ${f.title}, ${f.url}. It credits you and links straight to your site.`,
      "",
      `You're also listed under ${d.categoryLabel} (${d.categoryUrl}), and that listing is yours to claim, for free: ${d.claimUrl}`,
      "",
      `Either way, keep building great things.`,
      "",
      d.sender,
      `Founder, ${SITE_NAME}`,
      "",
      `Rather not be listed? Remove it here and the feature comes down with it (no account needed, and we won't email you again): ${d.removeUrl}`,
    ].join("\n");
  }
  return [
    `${firstName(d.name)}, you've been chosen to be featured on ${SITE_NAME}.`,
    "",
    `I'm ${d.sender}, and I'm building ${SITE_NAME} (${SITE_URL}), a place where people's work speaks for them, starting with talent here in Nigeria. We hand-pick every portfolio on our Discover page, and yours made the cut.`,
    "",
    `I came across ${d.host} and ${COMPLIMENT_PLACEHOLDER} You're now featured under ${d.categoryLabel}: ${d.categoryUrl}`,
    "",
    `The listing only shows your name, your role and a link to your site. It's yours to claim, for free: ${d.claimUrl}`,
    "",
    `Either way, keep building great things.`,
    "",
    d.sender,
    `Founder, ${SITE_NAME}`,
    "",
    `Rather not be listed? Remove it here (no account needed, and we won't email you again): ${d.removeUrl}`,
  ].join("\n");
}
