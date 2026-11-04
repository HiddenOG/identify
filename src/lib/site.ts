/** Product name in one place so renaming is a one-line change. */
export const SITE_NAME = "Identify";
export const SITE_TAGLINE = "Where builders show their work.";

/** The live address, used for absolute links in link previews. Override with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://identify.com.im";

/** Where people reach the team (About, Privacy, Terms). Leave empty to hide the contact lines. */
export const CONTACT_EMAIL = "identfai@gmail.com";

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
