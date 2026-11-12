import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * The Discover outreach email, as designed HTML (same look as the auth emails in
 * supabase/templates) plus a plain-text version, written as Identify choosing them. The admin
 * page copies it for one listing; the invites sheet fills it for many. `compliment` is one
 * specific line about their work; without it a highlighted placeholder stands in.
 */

export type InviteDetails = {
  name: string;
  host: string;
  categoryLabel: string;
  categoryUrl: string;
  claimUrl: string;
  removeUrl: string;
  /** Where they are (the listing's location, e.g. "Lagos, Nigeria" or "Germany"); words the intro. */
  location?: string | null;
  /** One specific, true sentence about their work. */
  compliment?: string | null;
  /** A published Discoveries feature about them; the email then leads with it. */
  feature?: { title: string; url: string };
};

/** Shown highlighted in the email so it isn't sent without being replaced. */
export const COMPLIMENT_PLACEHOLDER = "[One specific thing you liked about their work: replace this line]";

export function inviteSubject(name: string, featured = false) {
  return featured ? `${firstName(name)}, ${SITE_NAME} wrote about your work` : `${firstName(name)}, ${SITE_NAME} has chosen your portfolio`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

const NIGERIAN = /\b(nigeria|nigerian|lagos|abuja|ibadan|port harcourt|enugu|kano)\b/i;

/** What Identify is, worded for where they are: Nigeria is home; everyone else joins builders worldwide. */
function whoWeAre(location?: string | null) {
  return location && NIGERIAN.test(location)
    ? `${SITE_NAME} is a home for people whose work speaks for them, starting with talent here in Nigeria.`
    : `${SITE_NAME} is a home for people whose work speaks for them, with builders from all over the world.`;
}

/** "…and yours made the cut", naming where they're from when that's known and it isn't Nigeria. */
function madeTheCut(location?: string | null) {
  return location && !NIGERIAN.test(location) ? `and yours, from ${location}, made the cut.` : "and yours made the cut.";
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const p = (html: string) => `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#374151;font-family:${font};">${html}</p>`;

export function inviteHtml(d: InviteDetails) {
  const first = esc(firstName(d.name));
  const link = (href: string, text: string) => `<a href="${esc(href)}" style="color:#111827;">${esc(text)}</a>`;
  const button = (href: string, text: string, primary: boolean) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;background:${primary ? "#111827" : "#ffffff"};color:${primary ? "#ffffff" : "#111827"};border:2px solid #111827;text-decoration:none;font-size:16px;font-weight:600;padding:12px 26px;border-radius:999px;font-family:${font};">${esc(text)}</a>`;
  const compliment = d.compliment?.trim() ? esc(d.compliment.trim()) : `<span style="background:#fef08a;">${esc(COMPLIMENT_PLACEHOLDER)}</span>`;
  const f = d.feature;
  const badge = f ? "&#10022; FEATURED IN IDENTIFY DISCOVERIES" : "&#10022; CHOSEN FOR DISCOVER";
  const heading = f ? `${first}, ${SITE_NAME} wrote about your work` : `${first}, ${SITE_NAME} has chosen your portfolio`;
  const intro = f
    ? [
        p(`${esc(whoWeAre(d.location))} In Discoveries, we find great work on the internet and tell the story behind it.`),
        p(`We found you through ${link(`https://${d.host}`, d.host)}. ${compliment} So we wrote about it: ${link(f.url, f.title)}. It credits you and links straight to your site.`),
        p(`You&rsquo;re also listed under ${link(d.categoryUrl, d.categoryLabel)}, and that listing is yours to claim, for free. Claiming it turns it into your own ${SITE_NAME} profile: a CV website at <strong>${esc(new URL(SITE_URL).host)}/yourname</strong>, the feature linked to it, and a place to write up your own projects.`),
      ].join("\n    ")
    : [
        p(`${esc(whoWeAre(d.location))} We hand-pick every portfolio on our Discover page, ${esc(madeTheCut(d.location))}`),
        p(`We found you through ${link(`https://${d.host}`, d.host)}. ${compliment} You&rsquo;re now featured under ${link(d.categoryUrl, d.categoryLabel)}.`),
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
    <p style="margin:0;font-size:16px;line-height:1.5;color:#111827;font-family:${font};"><strong>The ${SITE_NAME} team</strong><br><span style="color:#6b7280;">${link(SITE_URL, new URL(SITE_URL).host)}</span></p>
    <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#9ca3af;font-family:${font};">Rather not be listed? ${`<a href="${esc(d.removeUrl)}" style="color:#9ca3af;">Remove your listing</a>`}${f ? " (the feature comes down with it)" : ""}. It comes down straight away, no account needed, and we won&rsquo;t email you again.</p>
  </td></tr>
</table>
</div>`;
}

export function inviteText(d: InviteDetails) {
  const compliment = d.compliment?.trim() || COMPLIMENT_PLACEHOLDER;
  const signOff = ["Either way, keep building great things.", "", `The ${SITE_NAME} team`, SITE_URL];
  const f = d.feature;
  if (f) {
    return [
      `${firstName(d.name)}, ${SITE_NAME} wrote about your work.`,
      "",
      `${whoWeAre(d.location)} In Discoveries, we find great work on the internet and tell the story behind it.`,
      "",
      `We found you through ${d.host}. ${compliment} So we wrote about it: ${f.title}, ${f.url}. It credits you and links straight to your site.`,
      "",
      `You're also listed under ${d.categoryLabel} (${d.categoryUrl}), and that listing is yours to claim, for free: ${d.claimUrl}`,
      "",
      ...signOff,
      "",
      `Rather not be listed? Remove it here and the feature comes down with it (no account needed, and we won't email you again): ${d.removeUrl}`,
    ].join("\n");
  }
  return [
    `${firstName(d.name)}, ${SITE_NAME} has chosen your portfolio.`,
    "",
    `${whoWeAre(d.location)} We hand-pick every portfolio on our Discover page, ${madeTheCut(d.location)}`,
    "",
    `We found you through ${d.host}. ${compliment} You're now featured under ${d.categoryLabel}: ${d.categoryUrl}`,
    "",
    `The listing only shows your name, your role and a link to your site. It's yours to claim, for free: ${d.claimUrl}`,
    "",
    ...signOff,
    "",
    `Rather not be listed? Remove it here (no account needed, and we won't email you again): ${d.removeUrl}`,
  ].join("\n");
}
