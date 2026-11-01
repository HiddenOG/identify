-- Buildfolio initial schema: profiles (with CV JSON), projects, likes, comments.
-- Every table has Row Level Security on; reads are public, writes are owner-only.

-- ============ helpers ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ profiles ============
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  -- null until the user finishes onboarding
  username     text unique
               check (username ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  full_name    text check (char_length(full_name) <= 80),
  headline     text check (char_length(headline) <= 120),
  location     text check (char_length(location) <= 80),
  avatar_url   text,
  -- structured CV content, validated by src/lib/cv/schema.ts
  cv           jsonb not null default '{}'::jsonb,
  template     text not null default 'classic',
  -- theme overrides (colors + font), validated by src/lib/themes.ts
  theme        jsonb not null default '{}'::jsonb,
  open_to_work boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Profiles are public"
  on public.profiles for select using (true);

create policy "Users update their own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Create a profile row whenever someone signs up (email or OAuth).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ projects ============
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  slug          text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  title         text not null check (char_length(title) between 1 and 140),
  summary       text check (char_length(summary) <= 280),
  body_md       text not null default '' check (char_length(body_md) <= 100000),
  cover_url     text,
  demo_url      text,
  repo_url      text,
  tags          text[] not null default '{}' check (cardinality(tags) <= 8),
  status        text not null default 'draft' check (status in ('draft', 'published')),
  published_at  timestamptz,
  like_count    integer not null default 0,
  comment_count integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (author_id, slug)
);

create index projects_feed_idx on public.projects (published_at desc) where status = 'published';
create index projects_author_idx on public.projects (author_id);
create index projects_tags_idx on public.projects using gin (tags);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

-- Counters are maintained by triggers only; clients may not write them.
revoke insert, update on public.projects from anon, authenticated;
grant insert (author_id, slug, title, summary, body_md, cover_url, demo_url, repo_url, tags, status, published_at)
  on public.projects to authenticated;
grant update (slug, title, summary, body_md, cover_url, demo_url, repo_url, tags, status, published_at)
  on public.projects to authenticated;

create policy "Published projects are public; drafts visible to author"
  on public.projects for select
  using (status = 'published' or (select auth.uid()) = author_id);

create policy "Authors create their own projects"
  on public.projects for insert
  with check ((select auth.uid()) = author_id);

create policy "Authors update their own projects"
  on public.projects for update
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "Authors delete their own projects"
  on public.projects for delete
  using ((select auth.uid()) = author_id);

-- ============ likes ============
create table public.likes (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index likes_user_idx on public.likes (user_id);

alter table public.likes enable row level security;

create policy "Likes are public"
  on public.likes for select using (true);

create policy "Users like as themselves"
  on public.likes for insert
  with check ((select auth.uid()) = user_id);

create policy "Users remove their own likes"
  on public.likes for delete
  using ((select auth.uid()) = user_id);

-- ============ comments ============
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  parent_id  uuid references public.comments (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index comments_project_idx on public.comments (project_id, created_at);

alter table public.comments enable row level security;

create policy "Comments are public"
  on public.comments for select using (true);

create policy "Users comment as themselves"
  on public.comments for insert
  with check ((select auth.uid()) = author_id);

create policy "Comment author or project owner can delete"
  on public.comments for delete
  using (
    (select auth.uid()) = author_id
    or (select auth.uid()) = (select p.author_id from public.projects p where p.id = project_id)
  );

-- ============ denormalized counters ============
create or replace function public.bump_project_counter()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
  pid   uuid    := coalesce(new.project_id, old.project_id);
begin
  if tg_table_name = 'likes' then
    update public.projects set like_count = greatest(like_count + delta, 0) where id = pid;
  else
    update public.projects set comment_count = greatest(comment_count + delta, 0) where id = pid;
  end if;
  return null;
end;
$$;

create trigger likes_count
  after insert or delete on public.likes
  for each row execute function public.bump_project_counter();

create trigger comments_count
  after insert or delete on public.comments
  for each row execute function public.bump_project_counter();

-- ============ storage ============
-- Files go under "<user id>/..." so the folder name proves ownership.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('project-images', 'project-images', true)
on conflict (id) do nothing;

create policy "Users upload to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'project-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update files in their own folder"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'project-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete files in their own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'project-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
