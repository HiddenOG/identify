-- Library → History: projects each person has opened, most recent first. Private to its owner.
-- Run after 20261031000000_messages.sql.

create table public.reading_history (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index reading_history_recent_idx on public.reading_history (user_id, viewed_at desc);

alter table public.reading_history enable row level security;

create policy "People see their own history"
  on public.reading_history for select
  using ((select auth.uid()) = user_id);

create policy "People add to their own history"
  on public.reading_history for insert
  with check ((select auth.uid()) = user_id);

create policy "People update their own history"
  on public.reading_history for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "People clear their own history"
  on public.reading_history for delete
  using ((select auth.uid()) = user_id);
