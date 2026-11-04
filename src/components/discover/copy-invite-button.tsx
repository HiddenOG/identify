"use client";

import { useState } from "react";

type Props = { html: string; text: string; to: string; subject: string; fromAccount: string; className: string };

/**
 * Copies the designed invite email (HTML, with a plain-text fallback) and opens a Gmail draft
 * from `fromAccount` with the recipient and subject filled in; the admin pastes and sends.
 */
export function CopyInviteButton({ html, text, to, subject, fromAccount, className }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  function copyAndOpen() {
    // Start the copy before opening the tab: the browser only allows it while this page has focus.
    const copied = navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
    const gmail = new URL("https://mail.google.com/mail/");
    if (fromAccount) gmail.searchParams.set("authuser", fromAccount);
    gmail.searchParams.set("view", "cm");
    gmail.searchParams.set("fs", "1");
    gmail.searchParams.set("to", to);
    gmail.searchParams.set("su", subject);
    window.open(gmail.toString(), "_blank", "noopener");
    copied.then(
      () => setState("copied"),
      () => setState("failed"),
    );
  }

  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={copyAndOpen} className={className}>
        Copy invite &amp; open Gmail
      </button>
      {state === "copied" && <span className="mt-1 text-xs text-success">Copied. In Gmail, click the message box and press Ctrl+V.</span>}
      {state === "failed" && <span className="mt-1 text-xs text-danger">Couldn&apos;t copy. Allow clipboard access and try again.</span>}
    </span>
  );
}
