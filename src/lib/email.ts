/**
 * Server only. Sends app emails (not the auth ones, which Supabase sends) through Resend's HTTP API.
 * Needs RESEND_API_KEY; EMAIL_FROM defaults to Identify <hello@identify.com.im>, a domain
 * already verified in Resend. Without a key nothing is sent and the reason is logged.
 */
const FROM = process.env.EMAIL_FROM ?? "Identify <hello@identify.com.im>";
const BATCH = 100; // Resend's batch limit

export type OutgoingEmail = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };

/** Sends each email separately (recipients never see each other), 100 per request. Returns how many went. */
export async function sendEmails(emails: OutgoingEmail[]): Promise<number> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[email] RESEND_API_KEY is not set; skipped", emails.length, "emails");
    return 0;
  }
  let sent = 0;
  for (let i = 0; i < emails.length; i += BATCH) {
    const chunk = emails.slice(i, i + BATCH);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(chunk.map((e) => ({ from: FROM, ...e }))),
    });
    if (!res.ok) {
      console.error("[email] Resend batch failed", res.status, (await res.text()).slice(0, 300));
      continue;
    }
    sent += chunk.length;
  }
  return sent;
}
