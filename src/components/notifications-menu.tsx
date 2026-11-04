"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AuthorAvatar } from "@/components/author-avatar";
import { BellIcon } from "@/components/icons";
import { usePopover } from "@/components/use-popover";
import { loadMenuNotifications, type MenuNotification } from "@/lib/notification-actions";

function Describe({ n }: { n: MenuNotification }) {
  const title = n.projectTitle && <span className="text-foreground">{n.projectTitle}</span>;
  const listing = <span className="text-foreground">{n.portfolioName ?? "a Discover listing"}</span>;
  if (n.type === "portfolio_claimed") return <>claimed their Discover listing, {listing} 🎉</>;
  if (n.type === "portfolio_claim_request") return <>asked to claim {listing}. Review it in Discover admin</>;
  if (n.type === "follow") return <>followed you</>;
  if (n.type === "like") return <>liked {title ?? "your project"}</>;
  return <>responded to {title ?? "your project"}</>;
}

/** The header bell: a Medium-style dropdown of recent activity, loaded when opened. */
export function NotificationsMenu({ unread }: { unread: number }) {
  const { open, setOpen, root } = usePopover<HTMLDivElement>();
  const [items, setItems] = useState<MenuNotification[] | null>(null);
  const [badge, setBadge] = useState(unread);
  const [loading, startLoading] = useTransition();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    // Refetch each time it opens so it's never stale; opening marks everything read.
    startLoading(async () => {
      setItems(await loadMenuNotifications());
      setBadge(0);
    });
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={badge ? `Notifications (${badge} unread)` : "Notifications"}
        onClick={toggle}
        className={`relative grid place-items-center ${open ? "text-foreground" : "text-muted hover:text-foreground"}`}
      >
        <BellIcon />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] leading-4 font-semibold text-brand-ink">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-2 top-14 z-50 mt-1 max-h-[75vh] overflow-y-auto rounded-lg border border-line bg-background shadow-[0_8px_30px_rgb(0_0_0/0.18)] sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-3 sm:w-96"
        >
          <p className="sticky top-0 border-b border-line bg-background px-5 py-3.5 text-xs font-medium tracking-[0.12em] text-muted uppercase">
            Notifications
          </p>

          {items === null || (loading && items.length === 0) ? (
            <p className="px-5 py-8 text-sm text-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">Likes, responses and new followers will show up here.</p>
          ) : (
            <ul className="py-2">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} className={`flex gap-4 px-5 py-3.5 hover:bg-surface ${n.unread ? "bg-brand/10" : ""}`}>
                    <AuthorAvatar name={n.actorName} url={n.actorAvatar} size={40} />
                    <div className="min-w-0 text-[15px] leading-snug text-muted">
                      <p>
                        <span className="text-foreground">{n.actorName}</span> <Describe n={n} />
                      </p>
                      <p className="mt-0.5">{n.when}</p>
                      {n.comment && (
                        <p className="mt-3 line-clamp-2 border-l-2 border-line pl-4 text-sm">{n.comment}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link href="/notifications" className="block border-t border-line px-5 py-3 text-center text-sm text-muted hover:text-foreground">
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
