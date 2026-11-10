/** Product name in one place so renaming is a one-line change. */
export const SITE_NAME = "Identify";
export const SITE_TAGLINE = "Where builders show their work.";

/** The live address, used for absolute links in link previews. Override with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://identify.com.im";

/** Where people reach the team (About, Privacy, Terms). Leave empty to hide the contact lines. */
export const CONTACT_EMAIL = "identfai@gmail.com";

/**
 * The Google sign-in client (Google Cloud project "identify"). Public by design: it's in every
 * page that shows the Google button. Its Authorized JavaScript origins must list this site.
 */
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "161042568154-mv6kb3k856ija4ft6fq2dmg04haq5jev.apps.googleusercontent.com";

/** The Identify account's username: its new stories tell every member by default. */
export const IDENTIFY_USERNAME = "identify";

/** Shown in the visitors' footer, the home sidebar and the account menu. Search and People live in the header. */
export const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/new", label: "Write" },
  { href: "/preview/classic", label: "Sample CV" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];
