import Link from "next/link";
import { AuthorAvatar } from "@/components/author-avatar";
import type { ConversationSummary } from "@/lib/messages";

/** The inbox column: one row per conversation, newest first. */
export function ConversationList({ conversations, activeId }: { conversations: ConversationSummary[]; activeId?: string }) {
  if (conversations.length === 0) {
    return (
      <p className="px-5 py-8 text-sm text-muted">
        No messages yet. Open someone&apos;s profile and press <span className="text-foreground">Message</span> to start a
        conversation.
      </p>
    );
  }

  return (
    <ul>
      {conversations.map((c) => {
        const name = c.other.full_name || c.other.username;
        return (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              aria-current={c.id === activeId ? "page" : undefined}
              className={`flex gap-3 border-b border-line px-5 py-4 hover:bg-surface ${c.id === activeId ? "bg-surface" : ""}`}
            >
              <AuthorAvatar name={name} url={c.other.avatar_url} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`truncate ${c.unread ? "font-semibold" : "font-medium"}`}>{name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted">{c.when}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className={`min-w-0 flex-1 truncate text-sm ${c.unread ? "text-foreground" : "text-muted"}`}>
                    {c.previewMine && "You: "}
                    {c.preview}
                  </p>
                  {c.unread > 0 && (
                    <span className="min-w-5 shrink-0 rounded-full bg-brand px-1.5 text-center text-xs leading-5 font-semibold text-brand-ink">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
