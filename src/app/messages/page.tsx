import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/conversation-list";
import { SetupNotice } from "@/components/setup-notice";
import { getConversations } from "@/lib/messages";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

/** Inbox. On wide screens the right pane waits for a conversation to be picked. */
export default function MessagesPage({ searchParams }: PageProps<"/messages">) {
  return (
    <main className="mx-auto h-[calc(100dvh-3.5rem)] max-w-5xl md:px-6 md:py-6">
      {hasSupabaseEnv ? (
        <Suspense>
          <Inbox searchParams={searchParams} />
        </Suspense>
      ) : (
        <SetupNotice />
      )}
    </main>
  );
}

async function Inbox({ searchParams }: Pick<PageProps<"/messages">, "searchParams">) {
  const error = (await searchParams).error;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const me = data?.claims?.sub;
  if (!me) redirect("/login?next=/messages");
  const conversations = await getConversations(supabase, me);

  return (
    <div className="grid h-full overflow-hidden md:grid-cols-[340px_1fr] md:rounded-lg md:border md:border-line">
      <section className="min-h-0 overflow-y-auto md:border-r md:border-line">
        <h1 className="border-b border-line px-5 py-4 text-xl font-bold tracking-tight">Messages</h1>
        {typeof error === "string" && <p className="border-b border-line px-5 py-3 text-sm text-danger">{error}</p>}
        <ConversationList conversations={conversations} />
      </section>
      <div className="hidden place-items-center p-8 text-center text-muted md:grid">
        <div>
          <p className="text-lg text-foreground">Your messages</p>
          <p className="mt-1 text-sm">Pick a conversation, or press Message on anyone&apos;s profile to start one.</p>
        </div>
      </div>
    </div>
  );
}
