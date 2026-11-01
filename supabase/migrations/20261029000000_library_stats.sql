-- Library (bookmarks) and Stats (project views and reads).
-- Run after 20261028000000_growth.sql.

-- ============ bookmarks ============
create table public.bookmarks (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

alter table public.bookmarks enable row level security;

create policy "Users see their own bookmarks"
  on public.bookmarks for select
  using ((select auth.uid()) = user_id);

create policy "Users bookmark as themselves"
  on public.bookmarks for insert
  with check ((select auth.uid()) = user_id);

create policy "Users remove their own bookmarks"
  on public.bookmarks for delete
  using ((select auth.uid()) = user_id);

-- ============ project events (views and reads) ============
-- One row per viewer, project, kind and day, so refreshing doesn't inflate numbers.
-- viewer is the user id, or an anonymous cookie id for signed-out readers.
create table public.project_events (
  project_id uuid not null references public.projects (id) on delete cascade,
  kind       text not null check (kind in ('view', 'read')),
  viewer     text not null check (char_length(viewer) <= 64),
  day        date not null default (now() at time zone 'utc')::date,
  primary key (project_id, kind, viewer, day)
);

create index project_events_day_idx on public.project_events (project_id, day);

alter table public.project_events enable row level security;

-- Written only through record_project_event(); authors can read events on their own projects.
revoke all on public.project_events from anon, authenticated;
grant select on public.project_events to authenticated;

create policy "Authors read events on their projects"
  on public.project_events for select
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and p.author_id = (select auth.uid())
  ));

create or replace function public.record_project_event(p_project uuid, p_kind text, p_anon text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  owner uuid;
begin
  if p_kind not in ('view', 'read') then return; end if;
  select author_id into owner from public.projects where id = p_project and status = 'published';
  -- Unknown or draft project, or the author reading their own work: not counted.
  if owner is null or owner = me then return; end if;
  if me is null and (p_anon is null or p_anon !~ '^[0-9a-f-]{36}$') then return; end if;

  insert into public.project_events (project_id, kind, viewer)
  values (p_project, p_kind, coalesce(me::text, 'anon:' || p_anon))
  on conflict do nothing;
end;
$$;

revoke all on function public.record_project_event(uuid, text, text) from public;
grant execute on function public.record_project_event(uuid, text, text) to anon, authenticated;

-- ============ stats for the signed-in author (dates are UTC) ============
create or replace function public.my_daily_stats(start_day date, end_day date)
returns table (day date, views bigint, reads bigint)
language sql stable security invoker set search_path = '' as $$
  select e.day,
         count(*) filter (where e.kind = 'view'),
         count(*) filter (where e.kind = 'read')
  from public.project_events e
  join public.projects p on p.id = e.project_id
  where p.author_id = (select auth.uid()) and e.day between start_day and end_day
  group by e.day
  order by e.day;
$$;

create or replace function public.my_period_totals(start_day date, end_day date)
returns table (views bigint, reads bigint, likes bigint, responses bigint, followers bigint)
language sql stable security invoker set search_path = '' as $$
  select
    (select count(*) from public.project_events e join public.projects p on p.id = e.project_id
      where p.author_id = (select auth.uid()) and e.kind = 'view' and e.day between start_day and end_day),
    (select count(*) from public.project_events e join public.projects p on p.id = e.project_id
      where p.author_id = (select auth.uid()) and e.kind = 'read' and e.day between start_day and end_day),
    (select count(*) from public.likes l join public.projects p on p.id = l.project_id
      where p.author_id = (select auth.uid()) and l.user_id <> p.author_id
        and (l.created_at at time zone 'utc')::date between start_day and end_day),
    (select count(*) from public.comments c join public.projects p on p.id = c.project_id
      where p.author_id = (select auth.uid()) and c.author_id <> p.author_id
        and (c.created_at at time zone 'utc')::date between start_day and end_day),
    (select count(*) from public.follows f
      where f.following_id = (select auth.uid())
        and (f.created_at at time zone 'utc')::date between start_day and end_day);
$$;

create or replace function public.my_story_stats()
returns table (project_id uuid, views bigint, reads bigint)
language sql stable security invoker set search_path = '' as $$
  select e.project_id,
         count(*) filter (where e.kind = 'view'),
         count(*) filter (where e.kind = 'read')
  from public.project_events e
  join public.projects p on p.id = e.project_id
  where p.author_id = (select auth.uid())
  group by e.project_id;
$$;

revoke all on function public.my_daily_stats(date, date) from public, anon;
revoke all on function public.my_period_totals(date, date) from public, anon;
revoke all on function public.my_story_stats() from public, anon;
grant execute on function public.my_daily_stats(date, date) to authenticated;
grant execute on function public.my_period_totals(date, date) to authenticated;
grant execute on function public.my_story_stats() to authenticated;
