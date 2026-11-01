"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { Message } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

/** Opens (or creates) the conversation with a profile and goes to it. */
export async function startConversation(profileId: string) {
  const { supabase, userId } = await session();
  if (!userId) redirect("/login");
  const { data, error } = await supabase.rpc("start_conversation", { other: profileId });
  if (error || !data) redirect(`/messages?error=${encodeURIComponent(error?.message ?? "Couldn't start that conversation.")}`);
  redirect(`/messages/${data}`);
}

const messageSchema = z.object({
  conversationId: z.uuid(),
  body: z.string().trim().min(1, "Write a message first.").max(4000, "Messages are limited to 4000 characters."),
});

export async function sendMessage(conversationId: string, body: string): Promise<{ message?: Message; error?: string }> {
  const parsed = messageSchema.safeParse({ conversationId, body });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, userId } = await session();
  if (!userId) return { error: "Your session expired. Sign in again." };

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: parsed.data.conversationId, sender_id: userId, body: parsed.data.body })
    .select("*")
    .single<Message>();
  if (error) return { error: error.message };
  return { message: data };
}

/** Marks everything the other person sent in this conversation as read. */
export async function markConversationRead(conversationId: string) {
  const { supabase, userId } = await session();
  if (!userId) return;
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);
}
