-- When Identify publishes a story (an admin ticks "Tell all members"), every member gets a bell
-- notification and, unless they switched it off in Settings, an email. broadcast_story() does
-- both halves on the database side once per story: it writes the notifications and returns who to
-- email (the app sends through Resend). Run after 20261110000000_editorial.sql.

-- Members can turn the emails off in Settings (the bell notification always arrives).
alter table public.profiles add column email_updates boolean not null default true;

-- The editor's "Tell all members" box (kept on drafts, so publishing later still sends), and when
-- it was sent: set the first time, so publishing again never re-sends.
alter table public.projects
  add column notify_members boolean not null default false,
  add column broadcast_at   timestamptz;

-- No column grant: only admins set it, on their own stories.
create or replace function public.set_notify_members(target uuid, notify boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can notify members';
  end if;
  update public.projects set notify_members = coalesce(notify, false) where id = target and author_id = auth.uid();
end;
$$;

revoke all on function public.set_notify_members(uuid, boolean) from public, anon;
grant execute on function public.set_notify_members(uuid, boolean) to authenticated;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'follow', 'portfolio_claimed', 'portfolio_claim_request', 'featured', 'story_featured', 'identify_story'));

-- Admins only, on their own published story. Returns the members to email (empty if it was
-- already broadcast). Emails come from auth.users, which only this function can read.
create or replace function public.broadcast_story(target uuid)
returns table (email text, name text)
language plpgsql security definer set search_path = '' as $$
declare
  author uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can broadcast stories';
  end if;

  update public.projects set broadcast_at = now()
    where id = target and author_id = auth.uid() and status = 'published' and notify_members and broadcast_at is null
    returning author_id into author;
  if author is null then
    return;
  end if;

  insert into public.notifications (user_id, actor_id, type, project_id)
  select p.id, author, 'identify_story', target
  from public.profiles p
  where p.id <> author and p.username is not null;

  return query
    select u.email::text, coalesce(nullif(p.full_name, ''), p.username)::text
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id <> author and p.username is not null and p.email_updates and u.email is not null;
end;
$$;

revoke all on function public.broadcast_story(uuid) from public, anon;
grant execute on function public.broadcast_story(uuid) to authenticated;
