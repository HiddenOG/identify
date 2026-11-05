"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getChatPartners, type Message } from "@/lib/messages";
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

export type ForwardTarget = { id: string; name: string; avatarUrl: string | null; headline: string | null };

/** Your other chats, newest first, for the Forward picker. */
export async function getForwardTargets(currentId: string): Promise<ForwardTarget[]> {
  const { supabase, userId } = await session();
  if (!userId) return [];
  const partners = await getChatPartners(supabase, userId);
  return partners
    .filter((c) => c.conversationId !== currentId)
    .map(({ conversationId, person }) => ({
      id: conversationId,
      name: person.full_name || person.username,
      avatarUrl: person.avatar_url,
      headline: person.headline,
    }));
}

const forwardSchema = z.object({
  fromId: z.uuid(),
  messageIds: z.array(z.uuid()).min(1, "Pick a message to forward.").max(20, "Forward up to 20 messages at a time."),
  toIds: z.array(z.uuid()).min(1, "Pick a chat to forward to.").max(10, "Forward to up to 10 chats at a time."),
});

/**
 * Sends copies of messages (text and any photo or file) from one of your chats to others.
 * RLS only returns messages and chats you're in; files are copied into each chat's own folder.
 */
export async function forwardMessages(fromId: string, messageIds: string[], toIds: string[]): Promise<{ forwarded?: number; error?: string }> {
  const parsed = forwardSchema.safeParse({ fromId, messageIds, toIds });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, userId } = await session();
  if (!userId) return { error: "Your session expired. Sign in again." };

  const [{ data: messages }, { data: targets }] = await Promise.all([
    supabase.from("messages").select("*").eq("conversation_id", fromId).in("id", parsed.data.messageIds).order("created_at").returns<Message[]>(),
    supabase.from("conversations").select("id").in("id", parsed.data.toIds).returns<{ id: string }[]>(),
  ]);
  if (!messages?.length) return { error: "Those messages are no longer available." };
  if (!targets?.length) return { error: "Pick a chat to forward to." };

  let forwarded = 0;
  for (const target of targets) {
    for (const m of messages) {
      let attachment: Pick<Message, "attachment_path" | "attachment_name" | "attachment_type" | "attachment_size"> = {};
      if (m.attachment_path) {
        const name = m.attachment_path.split("/").pop() ?? "file";
        const path = `${target.id}/${userId}/${crypto.randomUUID()}-${name.replace(/^[0-9a-f-]{36}-/, "")}`;
        const { error: copyError } = await supabase.storage.from("message-files").copy(m.attachment_path, path);
        if (copyError) {
          console.error("[messages.forwardMessages] copy", copyError.message);
          return { error: "Couldn't forward a photo or file. Try again.", forwarded };
        }
        attachment = { attachment_path: path, attachment_name: m.attachment_name, attachment_type: m.attachment_type, attachment_size: m.attachment_size };
      }
      const { error } = await supabase.from("messages").insert({ conversation_id: target.id, sender_id: userId, body: m.body, ...attachment });
      if (error) {
        console.error("[messages.forwardMessages] insert", error.message);
        return { error: "Couldn't forward. Try again.", forwarded };
      }
      forwarded++;
    }
  }
  return { forwarded };
}
