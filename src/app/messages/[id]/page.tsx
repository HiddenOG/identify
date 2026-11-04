import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ConversationList } from "@/components/conversation-list";
import { getConversation, getConversations, getMessages } from "@/lib/messages";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { Thread } from "../thread";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  return (
    <main className="mx-auto h-[calc(100dvh-3.5rem)] max-w-5xl md:px-6 md:py-6">
      <Suspense>
        <Conversation params={params} />
      </Suspense>
    </main>
  );
}

async function Conversation({ params }: Pick<PageProps<"/messages/[id]">, "params">) {
  if (!hasSupabaseEnv) notFound();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const me = data?.claims?.sub;
  if (!me) redirect(`/login?next=/messages/${id}`);

  // RLS returns nothing for a conversation you're not in.
  const conversation = await getConversation(supabase, id, me);
  if (!conversation) notFound();
  const [messages, conversations] = await Promise.all([getMessages(supabase, id), getConversations(supabase, me)]);

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)] overflow-hidden md:grid-cols-[340px_minmax(0,1fr)] md:rounded-lg md:border md:border-line">
      {/* Phones show just the thread (with a back arrow); wider screens keep the inbox alongside. */}
      <section className="hidden min-h-0 overflow-y-auto border-r border-line md:block">
        <h2 className="border-b border-line px-5 py-4 text-xl font-bold tracking-tight">Messages</h2>
        <ConversationList conversations={conversations} activeId={id} />
      </section>
      <Thread key={id} conversationId={id} me={me} other={conversation.other} initial={messages} />
    </div>
  );
}
