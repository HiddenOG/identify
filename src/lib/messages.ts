import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectAuthor } from "@/lib/projects";
import { shortTime } from "@/lib/time";

export type Person = ProjectAuthor & { id: string; headline: string | null };

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  /** The message this one replies to (same conversation). */
  reply_to?: string | null;
  /** A photo or file in the private message-files bucket: "<conversation>/<sender>/<file>". */
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
};

/** What the inbox shows for a message: its text, or what was attached. */
export function messagePreview(m: Pick<Message, "body" | "attachment_type" | "attachment_name">) {
  if (m.body) return m.body;
  if (m.attachment_type?.startsWith("image/")) return "📷 Photo";
  return m.attachment_name ? `📎 ${m.attachment_name}` : "📎 File";
}

export type ConversationSummary = {
  id: string;
  lastMessageAt: string;
  /** "5m", "2d", "Oct 24" */
  when: string;
  other: Person;
  preview: string | null;
  previewMine: boolean;
  unread: number;
};

// Hints are required: conversations has two foreign keys to profiles.
const PEOPLE =
  "id, last_message_at, user_a, user_b, a:profiles!conversations_user_a_fkey(id, username, full_name, avatar_url, headline), b:profiles!conversations_user_b_fkey(id, username, full_name, avatar_url, headline)";

type ConversationRow = { id: string; last_message_at: string; user_a: string; user_b: string; a: Person; b: Person };

/** The signed-in user's conversations, newest first, with a preview and unread count each. */
export async function getConversations(supabase: SupabaseClient, me: string): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(PEOPLE)
    .order("last_message_at", { ascending: false })
    .limit(50)
    .returns<ConversationRow[]>();
  if (error) console.error("[messages.getConversations]", error.message);
  const rows = data ?? [];
  if (!rows.length) return [];

  // Recent messages across these conversations: the newest per conversation is its preview.
  const { data: recent } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, body, read_at, created_at, attachment_type, attachment_name")
    .in("conversation_id", rows.map((r) => r.id))
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<Message[]>();

  const latest = new Map<string, Message>();
  const unread = new Map<string, number>();
  for (const m of recent ?? []) {
    if (!latest.has(m.conversation_id)) latest.set(m.conversation_id, m);
    if (m.sender_id !== me && !m.read_at) unread.set(m.conversation_id, (unread.get(m.conversation_id) ?? 0) + 1);
  }

  const now = Date.now();
  return rows
    .filter((r) => latest.has(r.id)) // a conversation opened but never written in stays hidden
    .map((r) => {
      const last = latest.get(r.id)!;
      return {
        id: r.id,
        lastMessageAt: r.last_message_at,
        when: shortTime(r.last_message_at, now),
        other: r.user_a === me ? r.b : r.a,
        preview: messagePreview(last),
        previewMine: last.sender_id === me,
        unread: unread.get(r.id) ?? 0,
      };
    });
}

/** One conversation and the other person in it; null if it doesn't exist or isn't the user's (RLS). */
export async function getConversation(supabase: SupabaseClient, id: string, me: string) {
  const { data, error } = await supabase.from("conversations").select(PEOPLE).eq("id", id).maybeSingle<ConversationRow>();
  if (error) console.error("[messages.getConversation]", error.message);
  if (!data) return null;
  return { id: data.id, other: data.user_a === me ? data.b : data.a };
}

export async function getMessages(supabase: SupabaseClient, conversationId: string, limit = 200) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Message[]>();
  if (error) console.error("[messages.getMessages]", error.message);
  return (data ?? []).reverse();
}

/** Messages sent to the user that they haven't opened (RLS limits this to their conversations). */
export async function getUnreadMessageCount(supabase: SupabaseClient, me: string) {
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .neq("sender_id", me)
    .is("read_at", null);
  if (error) console.error("[messages.getUnreadMessageCount]", error.message);
  return count ?? 0;
}
