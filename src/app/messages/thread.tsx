"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthorAvatar } from "@/components/author-avatar";
import { markConversationRead, sendMessage } from "@/lib/message-actions";
import type { Message, Person } from "@/lib/messages";
import { createClient } from "@/lib/supabase/client";

type Props = { conversationId: string; me: string; other: Person; initial: Message[] };

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

/** A live chat thread: Realtime delivers the other person's messages; yours appear instantly. */
export function Thread({ conversationId, me, other, initial }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, startSending] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);
  const name = other.full_name || other.username;

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

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function send(e?: FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setError("");
    setDraft("");
    // Show it right away; swap in the saved row when the server answers.
    const temp: Message = { id: `temp-${Date.now()}`, conversation_id: conversationId, sender_id: me, body, created_at: new Date().toISOString(), read_at: null };
    setMessages((list) => [...list, temp]);
    startSending(async () => {
      const result = await sendMessage(conversationId, body);
      if (result.error || !result.message) {
        setMessages((list) => list.filter((m) => m.id !== temp.id));
        setDraft(body);
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

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
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

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted">Say hello to {name}. Only the two of you can see this conversation.</p>
        )}
        <ul className="space-y-1.5">
          {messages.map((m, i) => {
            const mine = m.sender_id === me;
            const prev = messages[i - 1];
            const newDay = !prev || day(prev.created_at) !== day(m.created_at);
            return (
              <li key={m.id}>
                {newDay && (
                  <p className="my-4 text-center text-xs text-muted" suppressHydrationWarning>
                    {day(m.created_at)}
                  </p>
                )}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? "rounded-br-md bg-foreground text-background" : "rounded-bl-md bg-surface"} ${m.id.startsWith("temp-") ? "opacity-60" : ""}`}
                  >
                    <p className="break-words whitespace-pre-wrap">{m.body}</p>
                    <p className={`mt-0.5 text-right text-[11px] ${mine ? "opacity-60" : "text-muted"}`} suppressHydrationWarning>
                      {time(m.created_at)}
                      {mine && m.read_at && " · Seen"}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="border-t border-line p-3">
        {error && <p className="mb-2 px-2 text-sm text-danger">{error}</p>}
        <div className="flex items-end gap-2 rounded-2xl border border-line px-3 py-2 focus-within:border-foreground">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            maxLength={4000}
            placeholder={`Message ${name}`}
            aria-label={`Message ${name}`}
            className="max-h-40 min-h-6 min-w-0 flex-1 resize-none bg-transparent py-1 outline-none [field-sizing:content]"
          />
          <button
            disabled={!draft.trim() || sending}
            className="shrink-0 rounded-full bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <p className="mt-1 hidden px-2 text-xs text-muted md:block">Enter to send · Shift+Enter for a new line</p>
      </form>
    </div>
  );
}
