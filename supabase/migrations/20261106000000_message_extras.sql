-- Messages: reply to a specific message, and send photos or files (with or without text).
-- Files live in a PRIVATE bucket; only the two people in a conversation can read them, through
-- short-lived signed links. Run after 20261105000000_claim_requests.sql.

alter table public.messages
  add column reply_to        uuid references public.messages (id) on delete set null,
  add column attachment_path text check (char_length(attachment_path) <= 300),
  add column attachment_name text check (char_length(attachment_name) <= 200),
  add column attachment_type text check (char_length(attachment_type) <= 120),
  add column attachment_size integer check (attachment_size between 0 and 10485760);

-- Text is now optional when there's an attachment.
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check
  check (char_length(body) <= 4000 and (char_length(body) >= 1 or attachment_path is not null));

-- An attachment must sit in this conversation's folder: "<conversation id>/<sender id>/<file>".
alter table public.messages add constraint messages_attachment_folder_check
  check (attachment_path is null or attachment_path like conversation_id::text || '/' || sender_id::text || '/%');

-- A reply must point at a message in the same conversation; anything else is dropped.
create or replace function public.check_message_reply()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.reply_to is not null and not exists (
    select 1 from public.messages m where m.id = new.reply_to and m.conversation_id = new.conversation_id
  ) then
    new.reply_to := null;
  end if;
  return new;
end;
$$;

create trigger messages_check_reply
  before insert on public.messages
  for each row execute function public.check_message_reply();

-- ---------- Private storage for message files ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-files', 'message-files', false, 10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'text/csv', 'application/zip',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do nothing;

-- Folder 1 is the conversation, folder 2 the sender. A malformed folder name just fails the check.
create or replace function public.can_use_message_file(object_name text, uploading boolean)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  parts text[] := storage.foldername(object_name);
begin
  if parts[1] is null or parts[1] !~ '^[0-9a-f-]{36}$' then
    return false;
  end if;
  if not public.is_conversation_member(parts[1]::uuid) then
    return false;
  end if;
  return not uploading or parts[2] = (select auth.uid())::text;
end;
$$;

create policy "Conversation members read message files"
  on storage.objects for select to authenticated
  using (bucket_id = 'message-files' and public.can_use_message_file(name, false));

create policy "Conversation members upload message files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'message-files' and public.can_use_message_file(name, true));
