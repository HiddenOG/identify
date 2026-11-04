/** Cookies for the home page's "Get started" checklist, read on the server so there's no flash. */
export const GET_STARTED_COOKIE = "bf_getstarted"; // "hidden" once dismissed
export const SHARED_COOKIE = "bf_shared"; // "1" once they've copied or shared their CV link

/** Sets one of the cookies above from the browser, for a year. */
export function setPreferenceCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
