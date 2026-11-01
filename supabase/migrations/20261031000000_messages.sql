-- Private messages between two people.
-- Run after 20261030000000_account.sql.

-- ============ conversations ============
-- One row per pair of people; user_a < user_b so each pair exists once.
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid not null references public.profiles (id) on delete cascade,
  user_b          uuid not null references public.profiles (id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create index conversations_user_a_idx on public.conversations (user_a, last_message_at desc);
create index conversations_user_b_idx on public.conversations (user_b, last_message_at desc);

alter table public.conversations enable row level security;

-- Created only through start_conversation(); kept fresh by a trigger.
revoke insert, update, delete on public.conversations from anon, authenticated;

create policy "People see their own conversations"
  on public.conversations for select
  using ((select auth.uid()) in (user_a, user_b));

-- ============ messages ============
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 4000),
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_unread_idx on public.messages (conversation_id) where read_at is null;

alter table public.messages enable row level security;

-- Clients may only write the message itself, and mark received messages read.
revoke insert, update, delete on public.messages from anon, authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

-- Security definer so the policies below don't recurse through conversations' RLS.
create or replace function public.is_conversation_member(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id = cid and (select auth.uid()) in (c.user_a, c.user_b)
  );
$$;

create policy "Members read messages"
  on public.messages for select
  using (public.is_conversation_member(conversation_id));

create policy "Members send as themselves"
  on public.messages for insert
  with check ((select auth.uid()) = sender_id and public.is_conversation_member(conversation_id));

create policy "Recipients mark messages read"
  on public.messages for update
  using (public.is_conversation_member(conversation_id) and sender_id <> (select auth.uid()))
  with check (public.is_conversation_member(conversation_id) and sender_id <> (select auth.uid()));

-- Newest conversations float to the top of the inbox.
create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return null;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- Returns the conversation with `other`, creating it on first contact.
create or replace function public.start_conversation(other uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me  uuid := auth.uid();
  cid uuid;
begin
  if me is null then
    raise exception 'Sign in to send messages.';
  end if;
  if other = me then
    raise exception 'You can''t message yourself.';
  end if;
  if not exists (select 1 from public.profiles where id = other and username is not null) then
    raise exception 'That person doesn''t exist.';
  end if;

  insert into public.conversations (user_a, user_b)
  values (least(me, other), greatest(me, other))
  on conflict (user_a, user_b) do nothing;

  select id into cid from public.conversations
  where user_a = least(me, other) and user_b = greatest(me, other);
  return cid;
end;
$$;

revoke all on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

-- Live delivery: Supabase Realtime streams new rows (still filtered by the policies above).
alter publication supabase_realtime add table public.messages;
