-- Stage 6: follows, notifications, and a searchable skills column for recruiter filters.
-- Run after 20261027000000_init.sql.

-- ============ recruiter search ============
-- Skills + tools flattened to lowercase text so the people directory can filter with ilike.
alter table public.profiles
  add column cv_search text generated always as (
    lower(coalesce(cv ->> 'skills', '') || ' ' || coalesce(cv ->> 'tools', ''))
  ) stored;

create index profiles_open_to_work_idx on public.profiles (open_to_work) where open_to_work;

-- ============ follows ============
create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;

create policy "Follows are public"
  on public.follows for select using (true);

create policy "Users follow as themselves"
  on public.follows for insert
  with check ((select auth.uid()) = follower_id);

create policy "Users unfollow as themselves"
  on public.follows for delete
  using ((select auth.uid()) = follower_id);

-- ============ notifications ============
-- Written only by the triggers below; recipients can read them, mark them read and delete them.
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  actor_id   uuid not null references public.profiles (id) on delete cascade,
  type       text not null check (type in ('like', 'comment', 'follow')),
  project_id uuid references public.projects (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Users read their own notifications"
  on public.notifications for select
  using ((select auth.uid()) = user_id);

create policy "Users mark their own notifications read"
  on public.notifications for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own notifications"
  on public.notifications for delete
  using ((select auth.uid()) = user_id);

-- Likes, comments and follows notify the person on the receiving end (never yourself).
-- Unliking or unfollowing removes the notification so toggling doesn't spam.
create or replace function public.notify_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid;
begin
  if tg_table_name = 'follows' then
    if tg_op = 'INSERT' then
      insert into public.notifications (user_id, actor_id, type)
      values (new.following_id, new.follower_id, 'follow');
    else
      delete from public.notifications
      where type = 'follow' and user_id = old.following_id and actor_id = old.follower_id;
    end if;
    return null;
  end if;

  if tg_op = 'DELETE' then
    -- Only likes reach here on delete; deleted comments cascade via comment_id.
    delete from public.notifications
    where type = 'like' and project_id = old.project_id and actor_id = old.user_id;
    return null;
  end if;

  select author_id into recipient from public.projects where id = new.project_id;

  if tg_table_name = 'likes' then
    if recipient is distinct from new.user_id then
      insert into public.notifications (user_id, actor_id, type, project_id)
      values (recipient, new.user_id, 'like', new.project_id);
    end if;
  elsif recipient is distinct from new.author_id then
    insert into public.notifications (user_id, actor_id, type, project_id, comment_id)
    values (recipient, new.author_id, 'comment', new.project_id, new.id);
  end if;
  return null;
end;
$$;

create trigger follows_notify
  after insert or delete on public.follows
  for each row execute function public.notify_activity();

create trigger likes_notify
  after insert or delete on public.likes
  for each row execute function public.notify_activity();

create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_activity();
