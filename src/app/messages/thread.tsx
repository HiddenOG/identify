"use client";

/* eslint-disable @next/next/no-img-element -- photos come from short-lived signed links in a private bucket */
import { useEffect, useRef, useState, useTransition, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthorAvatar } from "@/components/author-avatar";
import { EmojiPicker } from "@/components/emoji-picker";
import { PaperclipIcon, ReplyIcon, SmileIcon } from "@/components/icons";
import { usePopover } from "@/components/use-popover";
import { forwardMessages, getForwardTargets, markConversationRead, sendMessage, type ForwardTarget } from "@/lib/message-actions";
import type { Message, Person } from "@/lib/messages";
import { createClient } from "@/lib/supabase/client";

type Props = { conversationId: string; me: string; other: Person; initial: Message[] };

const BUCKET = "message-files";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Must match the bucket's allowed types in the message_extras migration. */
const ACCEPT = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "text/plain", "text/csv", "application/zip",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
const isImage = (type?: string | null) => Boolean(type?.startsWith("image/"));
const fileSize = (bytes?: number | null) =>
  !bytes ? "" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** A short line for quoting a message (in a reply, or the "Replying to" bar). */
function snippet(m: Message) {
  if (m.body) return m.body.length > 90 ? `${m.body.slice(0, 90)}…` : m.body;
  return isImage(m.attachment_type) ? "📷 Photo" : `📎 ${m.attachment_name ?? "File"}`;
}

/**
 * A live chat thread: Realtime delivers the other person's messages; yours appear instantly.
 * Messages can reply to another message, carry a photo or file (private bucket, signed links),
 * and use emoji from the picker.
 */
export function Thread({ conversationId, me, other, initial }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, startSending] = useTransition();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  // Selecting messages to copy or forward: hold one on a phone, or the ✓ button on a computer.
  const [selected, setSelected] = useState<string[]>([]);
  const selecting = selected.length > 0;
  const [forwarding, setForwarding] = useState<{ targets: ForwardTarget[] | null; chosen: string[] } | null>(null);
  const [forwardPending, startForward] = useTransition();
  const [notice, setNotice] = useState("");
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Lifting the finger after a long press fires a click; it must not undo the selection.
  const swallowClick = useRef(false);
  const [file, setFile] = useState<{ file: File; preview: string | null } | null>(null);
  // Signed links for attachments, by storage path (or the local preview while sending).
  const [urls, setUrls] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const { open: emojiOpen, setOpen: setEmojiOpen, root: emojiRoot } = usePopover<HTMLDivElement>();
  const name = other.full_name || other.username;
  const byId = new Map(messages.map((m) => [m.id, m]));

  // Opening the thread reads it; refresh so the header badge and inbox catch up.
  useEffect(() => {
    markConversationRead(conversationId).then(() => router.refresh());
  }, [conversationId, router]);

  // New messages from the other person arrive over Supabase Realtime (RLS-filtered).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
          if (m.sender_id !== me) void markConversationRead(conversationId);
        },
      )
      // Read receipts: the other person opening the thread sets read_at on your messages.
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, read_at: m.read_at } : x)));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, me]);

  // Attachments are private: ask for hour-long signed links for any we haven't got yet.
  useEffect(() => {
    const missing = messages
      .map((m) => m.attachment_path)
      .filter((p): p is string => Boolean(p) && !p!.startsWith("local:") && !requested.current.has(p!));
    if (!missing.length) return;
    missing.forEach((p) => requested.current.add(p));
    createClient()
      .storage.from(BUCKET)
      .createSignedUrls(missing, 3600)
      .then(({ data }) => {
        const signed: Record<string, string> = {};
        for (const d of data ?? []) if (d.path && d.signedUrl) signed[d.path] = d.signedUrl;
        setUrls((u) => ({ ...u, ...signed }));
      });
  }, [messages]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function chooseFile(chosen: File | undefined) {
    if (!chosen) return;
    setError("");
    if (!ACCEPT.includes(chosen.type)) return setError("Send photos, PDFs, Word, Excel, PowerPoint, text, CSV or ZIP files.");
    if (chosen.size > MAX_FILE_BYTES) return setError("Files can be up to 10 MB.");
    if (file?.preview) URL.revokeObjectURL(file.preview);
    setFile({ file: chosen, preview: isImage(chosen.type) ? URL.createObjectURL(chosen) : null });
    input.current?.focus();
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.files[0];
    if (pasted && isImage(pasted.type)) {
      e.preventDefault();
      chooseFile(pasted);
    }
  }

  // Inserts at the cursor. The picker never takes focus, so if the keyboard was open it stays
  // open, and if it was closed, tapping emoji doesn't pop it up.
  function insertEmoji(symbol: string) {
    const el = input.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    setDraft((d) => d.slice(0, start) + symbol + d.slice(end));
    if (el && document.activeElement === el) {
      requestAnimationFrame(() => el.setSelectionRange(start + symbol.length, start + symbol.length));
    }
  }

  function send(e?: FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if ((!body && !file) || sending) return;
    const attached = file;
    const replying = replyTo;
    setError("");
    setDraft("");
    setFile(null);
    setReplyTo(null);

    // Show it right away (a photo uses its local preview); swap in the saved row when the server answers.
    const tempPath = attached ? `local:${attached.preview ?? attached.file.name}` : null;
    const temp: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: me,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
      reply_to: replying?.id ?? null,
      attachment_path: tempPath,
      attachment_name: attached?.file.name ?? null,
      attachment_type: attached?.file.type ?? null,
      attachment_size: attached?.file.size ?? null,
    };
    setMessages((list) => [...list, temp]);

    startSending(async () => {
      let attachment = null;
      if (attached) {
        const safe = attached.file.name.replace(/[^\w.-]+/g, "-").slice(-80) || "file";
        const path = `${conversationId}/${me}/${crypto.randomUUID()}-${safe}`;
        const { error: uploadError } = await createClient().storage.from(BUCKET).upload(path, attached.file, { contentType: attached.file.type });
        if (uploadError) {
          setMessages((list) => list.filter((m) => m.id !== temp.id));
          setDraft(body);
          setFile(attached);
          setReplyTo(replying);
          return setError("Couldn't upload that file. Try again.");
        }
        attachment = { path, name: attached.file.name, type: attached.file.type, size: attached.file.size };
        // Keep showing the local preview for the real path, so the photo doesn't flicker.
        if (attached.preview) {
          requested.current.add(path);
          setUrls((u) => ({ ...u, [path]: attached.preview! }));
        }
      }
      const result = await sendMessage(conversationId, body, { replyTo: replying?.id ?? null, attachment });
      if (result.error || !result.message) {
        setMessages((list) => list.filter((m) => m.id !== temp.id));
        setDraft(body);
        setFile(attached);
        setReplyTo(replying);
        setError(result.error ?? "Couldn't send. Try again.");
        return;
      }
      const saved = result.message;
      setMessages((list) => {
        const without = list.filter((m) => m.id !== temp.id);
        return without.some((m) => m.id === saved.id) ? without : [...without, saved];
      });
    });
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const urlFor = (path?: string | null) => (!path ? undefined : path.startsWith("local:") ? path.slice(6) : urls[path]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 3000);
  };

  // Holding a message on a touch screen selects it (like WhatsApp); moving or lifting cancels.
  function startPress(id: string, pointerType: string) {
    swallowClick.current = false; // a new touch: any click from here on is a real tap
    if (pointerType !== "touch" || selecting || id.startsWith("temp-")) return;
    press.current = setTimeout(() => {
      setSelected([id]);
      swallowClick.current = true;
      navigator.vibrate?.(15);
    }, 450);
  }
  function endPress() {
    if (press.current) clearTimeout(press.current);
    press.current = null;
  }

  // Selected messages in the order they were sent, not the order they were tapped.
  const chosen = messages.filter((m) => selected.includes(m.id) && !m.id.startsWith("temp-"));

  async function copySelected() {
    const text = chosen
      .map((m) => [m.attachment_path ? (isImage(m.attachment_type) ? "[Photo]" : `[File: ${m.attachment_name ?? "file"}]`) : "", m.body].filter(Boolean).join(" "))
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      flash(chosen.length === 1 ? "Copied" : `Copied ${chosen.length} messages`);
    } catch {
      flash("Couldn't copy. Try again.");
    }
    setSelected([]);
  }

  function openForward() {
    setForwarding({ targets: null, chosen: [] });
    getForwardTargets(conversationId).then((targets) => setForwarding((f) => (f ? { ...f, targets } : f)));
  }

  function sendForward() {
    if (!forwarding?.chosen.length) return;
    const to = forwarding.chosen;
    startForward(async () => {
      const result = await forwardMessages(conversationId, chosen.map((m) => m.id), to);
      setForwarding(null);
      setSelected([]);
      flash(result.error ?? `Forwarded to ${to.length} ${to.length === 1 ? "chat" : "chats"}`);
    });
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      {selecting ? (
        <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-3 sm:px-5">
          <button type="button" onClick={() => setSelected([])} aria-label="Cancel selection" className="-ml-1 grid size-9 shrink-0 place-items-center text-lg text-muted hover:text-foreground">
            ✕
          </button>
          <span className="font-medium">{selected.length} selected</span>
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={copySelected} className="rounded-full border border-line bg-background px-4 py-1.5 text-sm hover:border-foreground">
              Copy
            </button>
            <button type="button" onClick={openForward} className="rounded-full bg-foreground px-4 py-1.5 text-sm text-background hover:opacity-90">
              Forward
            </button>
          </span>
        </header>
      ) : (
      <header className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-5">
        <Link href="/messages" className="-ml-2 grid size-9 shrink-0 place-items-center text-lg text-muted hover:text-foreground md:hidden" aria-label="Back to messages">
          ←
        </Link>
        <Link href={`/${other.username}`} className="flex min-w-0 items-center gap-3 hover:underline">
          <AuthorAvatar name={name} url={other.avatar_url} size={36} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{name}</span>
            {other.headline && <span className="block truncate text-xs text-muted">{other.headline}</span>}
          </span>
        </Link>
        <Link href={`/${other.username}`} className="ml-auto shrink-0 text-sm text-muted hover:text-foreground">
          View CV
        </Link>
      </header>
      )}

      {notice && (
        <p role="status" className="mx-auto mt-2 rounded-full bg-foreground px-4 py-1.5 text-sm text-background">
          {notice}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6 sm:px-5" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted">Say hello to {name}. Only the two of you can see this conversation.</p>
        )}
        <ul className="space-y-1.5">
          {messages.map((m, i) => {
            const mine = m.sender_id === me;
            const prev = messages[i - 1];
            const newDay = !prev || day(prev.created_at) !== day(m.created_at);
            const quoted = m.reply_to ? byId.get(m.reply_to) : null;
            const url = urlFor(m.attachment_path);
            return (
              <li key={m.id} id={`m-${m.id}`} className="scroll-mt-24">
                {newDay && (
                  <p className="my-4 text-center text-xs text-muted" suppressHydrationWarning>
                    {day(m.created_at)}
                  </p>
                )}
                <div
                  className={`group -mx-2 flex items-center gap-1 rounded-xl px-2 py-0.5 ${mine ? "flex-row-reverse" : ""} ${selected.includes(m.id) ? "bg-brand/25" : ""} ${selecting ? "cursor-pointer" : ""}`}
                  onClickCapture={(e) => {
                    // While selecting, a tap selects instead of opening links or photos.
                    if (swallowClick.current) {
                      swallowClick.current = false;
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    if (!selecting || m.id.startsWith("temp-")) return;
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(m.id);
                  }}
                  onPointerDown={(e) => startPress(m.id, e.pointerType)}
                  onPointerUp={endPress}
                  onPointerLeave={endPress}
                  onPointerMove={(e) => (Math.abs(e.movementX) + Math.abs(e.movementY) > 6 ? endPress() : undefined)}
                  onContextMenu={(e) => selecting && e.preventDefault()}
                >
                  <div
                    className={`max-w-[80%] min-w-0 rounded-2xl px-3 py-2 select-text ${mine ? "rounded-br-md bg-foreground text-background" : "rounded-bl-md bg-surface"} ${m.id.startsWith("temp-") ? "opacity-60" : ""}`}
                  >
                    {m.reply_to && (
                      <a
                        href={`#m-${m.reply_to}`}
                        className={`mb-1.5 block border-l-2 px-2 py-0.5 text-xs ${mine ? "border-background/50 opacity-75" : "border-foreground/30 text-muted"}`}
                      >
                        <span className="block font-semibold">{quoted ? (quoted.sender_id === me ? "You" : name) : "Earlier message"}</span>
                        <span className="line-clamp-2 break-words">{quoted ? snippet(quoted) : "Not loaded"}</span>
                      </a>
                    )}
                    {m.attachment_path &&
                      (isImage(m.attachment_type) ? (
                        url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="mb-1 block">
                            <img src={url} alt={m.attachment_name ?? "Photo"} className="max-h-72 w-full rounded-lg object-cover" />
                          </a>
                        ) : (
                          <div className="mb-1 grid h-40 w-56 max-w-full place-items-center rounded-lg bg-background/10 text-xs opacity-70">Loading photo…</div>
                        )
                      ) : (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 ${mine ? "bg-background/15" : "bg-background"}`}
                        >
                          <PaperclipIcon size={20} className="shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{m.attachment_name ?? "File"}</span>
                            <span className="block text-xs opacity-70">{fileSize(m.attachment_size)}{url ? " · Open" : ""}</span>
                          </span>
                        </a>
                      ))}
                    {m.body && <p className="break-words whitespace-pre-wrap">{m.body}</p>}
                    <p className={`mt-0.5 text-right text-[11px] ${mine ? "opacity-60" : "text-muted"}`} suppressHydrationWarning>
                      {time(m.created_at)}
                      {mine && m.read_at && " · Seen"}
                    </p>
                  </div>
                  {!m.id.startsWith("temp-") && !selecting && (
                    <span className={`flex shrink-0 items-center ${mine ? "flex-row-reverse" : ""}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTo(m);
                          input.current?.focus();
                        }}
                        aria-label="Reply to this message"
                        className="grid size-8 place-items-center rounded-full text-muted opacity-0 transition group-hover:opacity-100 hover:bg-surface hover:text-foreground focus:opacity-100 [@media(hover:none)]:opacity-60"
                      >
                        <ReplyIcon size={16} />
                      </button>
                      {/* Phones select by holding a message, so this is for mouse users. */}
                      <button
                        type="button"
                        onClick={() => setSelected([m.id])}
                        aria-label="Select to copy or forward"
                        className="hidden size-8 place-items-center rounded-full text-muted opacity-0 transition group-hover:opacity-100 hover:bg-surface hover:text-foreground focus:opacity-100 [@media(hover:hover)]:grid"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                          <circle cx="12" cy="12" r="8.5" />
                          <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {selecting && !m.id.startsWith("temp-") && (
                    <span
                      aria-hidden
                      className={`grid size-5 shrink-0 place-items-center rounded-full border text-[11px] ${selected.includes(m.id) ? "border-success bg-success text-background" : "border-line"}`}
                    >
                      {selected.includes(m.id) ? "✓" : ""}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="border-t border-line p-3">
        {error && <p className="mb-2 px-2 text-sm text-danger">{error}</p>}
        {replyTo && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-foreground bg-surface px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold">Replying to {replyTo.sender_id === me ? "yourself" : name}</span>
              <span className="block truncate text-muted">{snippet(replyTo)}</span>
            </span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="text-muted hover:text-foreground">
              ✕
            </button>
          </div>
        )}
        {file && (
          <div className="mb-2 flex items-center gap-3 rounded-lg bg-surface p-2 text-sm">
            {file.preview ? (
              <img src={file.preview} alt="" className="size-12 rounded-md object-cover" />
            ) : (
              <span className="grid size-12 place-items-center rounded-md bg-background">
                <PaperclipIcon size={20} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{file.file.name}</span>
              <span className="block text-xs text-muted">{fileSize(file.file.size)}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (file.preview) URL.revokeObjectURL(file.preview);
                setFile(null);
              }}
              aria-label="Remove attachment"
              className="px-1 text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex items-end gap-1 rounded-2xl border border-line px-2 py-1.5 focus-within:border-foreground">
          <button
            type="button"
            onClick={() => picker.current?.click()}
            aria-label="Attach a photo or file"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-foreground"
          >
            <PaperclipIcon size={20} />
          </button>
          <input
            ref={picker}
            type="file"
            accept={ACCEPT.join(",")}
            className="sr-only"
            onChange={(e) => {
              chooseFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div ref={emojiRoot} className="relative shrink-0">
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()} // don't steal focus from the message box
              onClick={() => setEmojiOpen((o) => !o)}
              aria-label="Add an emoji"
              aria-expanded={emojiOpen}
              className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface hover:text-foreground"
            >
              <SmileIcon size={20} />
            </button>
            {emojiOpen && (
              <div className="absolute bottom-11 -left-10 z-30 sm:left-0">
                <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />
              </div>
            )}
          </div>
          <textarea
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onPaste={onPaste}
            rows={1}
            maxLength={4000}
            placeholder={`Message ${name}`}
            aria-label={`Message ${name}`}
            className="max-h-40 min-h-6 min-w-0 flex-1 resize-none bg-transparent py-1.5 outline-none [field-sizing:content]"
          />
          <button
            disabled={(!draft.trim() && !file) || sending}
            className="mb-0.5 shrink-0 rounded-full bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <p className="mt-1 hidden px-2 text-xs text-muted md:block">Enter to send · Shift+Enter for a new line · Paste a screenshot to attach it</p>
      </form>

      {forwarding && (
        <div className="fixed inset-0 z-50 bg-foreground/40" onClick={() => !forwardPending && setForwarding(null)}>
          <div
            role="dialog"
            aria-label="Forward messages"
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 flex max-h-[80dvh] flex-col rounded-t-2xl bg-background p-4 sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[26rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
          >
            <h2 className="text-lg font-bold">
              Forward {chosen.length} {chosen.length === 1 ? "message" : "messages"}
            </h2>
            <p className="mb-3 text-sm text-muted">Pick one or more chats. Photos and files go too.</p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {forwarding.targets === null ? (
                <p className="py-6 text-center text-sm text-muted">Loading your chats…</p>
              ) : forwarding.targets.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">No other chats yet. Start one with Message on someone&apos;s profile.</p>
              ) : (
                <ul className="space-y-1">
                  {forwarding.targets.map((t) => {
                    const on = forwarding.chosen.includes(t.id);
                    return (
                      <li key={t.id}>
                        <label className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${on ? "bg-surface" : "hover:bg-surface"}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              setForwarding((f) => f && { ...f, chosen: on ? f.chosen.filter((x) => x !== t.id) : [...f.chosen, t.id] })
                            }
                            className="size-4 accent-foreground"
                          />
                          <AuthorAvatar name={t.name} url={t.avatarUrl} size={36} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{t.name}</span>
                            {t.headline && <span className="block truncate text-xs text-muted">{t.headline}</span>}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-line pt-3">
              <button type="button" onClick={() => setForwarding(null)} disabled={forwardPending} className="rounded-full px-4 py-1.5 text-sm text-muted hover:text-foreground">
                Cancel
              </button>
              <button
                type="button"
                onClick={sendForward}
                disabled={!forwarding.chosen.length || forwardPending}
                className="rounded-full bg-foreground px-5 py-1.5 text-sm text-background disabled:opacity-40"
              >
                {forwardPending ? "Forwarding…" : forwarding.chosen.length > 1 ? `Forward to ${forwarding.chosen.length}` : "Forward"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
