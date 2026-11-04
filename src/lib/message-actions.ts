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

/** A photo or file the browser already uploaded to the private message-files bucket. */
export type MessageAttachment = { path: string; name: string; type: string; size: number };

const messageSchema = z.object({
  conversationId: z.uuid(),
  body: z.string().trim().max(4000, "Messages are limited to 4000 characters."),
  replyTo: z.uuid().nullish(),
  attachment: z
    .object({
      path: z.string().max(300),
      name: z.string().trim().min(1).max(200),
      type: z.string().max(120),
      size: z.number().int().min(0).max(10 * 1024 * 1024, "Files can be up to 10 MB."),
    })
    .nullish(),
});

export async function sendMessage(
  conversationId: string,
  body: string,
  extras: { replyTo?: string | null; attachment?: MessageAttachment | null } = {},
): Promise<{ message?: Message; error?: string }> {
  const parsed = messageSchema.safeParse({ conversationId, body, ...extras });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { body: text, replyTo, attachment } = parsed.data;
  if (!text && !attachment) return { error: "Write a message first." };
  const { supabase, userId } = await session();
  if (!userId) return { error: "Your session expired. Sign in again." };
  // Uploads go to "<conversation>/<sender>/…"; the database checks this too.
  if (attachment && !attachment.path.startsWith(`${conversationId}/${userId}/`)) return { error: "That file can't be sent here." };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: text,
      reply_to: replyTo ?? null,
      attachment_path: attachment?.path ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_type: attachment?.type ?? null,
      attachment_size: attachment?.size ?? null,
    })
    .select("*")
    .single<Message>();
  if (error) {
    console.error("[messages.sendMessage]", error.message);
    return { error: "Couldn't send. Try again." };
  }
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
