-- Discover: hand-picked portfolios of people who aren't on Identify yet. They're shown as
-- "Unclaimed" (name, role, link and the preview image their site publishes for sharing) until
-- the owner claims or removes them. Run after 20261101000000_history.sql.
--
-- Make yourself an admin once, in the SQL Editor (use your own sign-in email):
--   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';

-- ---------- Admins ----------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- No policies: nobody reads the table directly; is_admin() looks people up.
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- ---------- Portfolios ----------

create table public.portfolios (
  id           uuid primary key default gen_random_uuid(),
  url          text not null unique check (url ~ '^https?://'),
  name         text not null check (char_length(name) between 1 and 120),
  role         text check (char_length(role) <= 120),
  location     text check (char_length(location) <= 120),
  description  text check (char_length(description) <= 400),
  image_url    text check (image_url ~ '^https?://'),
  category     text not null check (category in ('developer', 'design', 'data', 'other')),
  status       text not null default 'pending' check (status in ('pending', 'listed', 'claimed', 'removed')),
  featured     boolean not null default false,
  source       text not null default 'admin' check (source in ('admin', 'suggested')),
  submitted_by uuid references public.profiles (id) on delete set null,
  claimed_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  listed_at    timestamptz
);

create index portfolios_public_idx on public.portfolios (status, category, featured desc, listed_at desc);
create unique index portfolios_claimed_by_idx on public.portfolios (claimed_by) where claimed_by is not null;

alter table public.portfolios enable row level security;

create policy "Listed portfolios are public"
  on public.portfolios for select
  using (
    status in ('listed', 'claimed')
    or (select public.is_admin())
    or submitted_by = (select auth.uid())
  );

-- Members can suggest a portfolio; it waits in the admin queue.
create policy "Members suggest portfolios"
  on public.portfolios for insert
  with check (
    (select public.is_admin())
    or (
      submitted_by = (select auth.uid())
      and source = 'suggested' and status = 'pending'
      and not featured and claimed_by is null and listed_at is null
    )
  );

create policy "Admins edit portfolios"
  on public.portfolios for update
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete portfolios"
  on public.portfolios for delete
  using ((select public.is_admin()));

-- ---------- Private contact details (admins only) ----------

create table public.portfolio_contacts (
  portfolio_id   uuid primary key references public.portfolios (id) on delete cascade,
  email          text check (email ~ '^[^@\s]+@[^@\s]+$'),
  invited_at     timestamptz,
  -- Set when someone asks to be removed; never email them again.
  do_not_contact boolean not null default false
);

alter table public.portfolio_contacts enable row level security;

create policy "Admins manage contacts"
  on public.portfolio_contacts for all
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------- Claims ----------

-- A claim that proves ownership with a code on the site waits here until an admin checks it.
create table public.portfolio_claims (
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (portfolio_id, user_id)
);

alter table public.portfolio_claims enable row level security;

create policy "People see their own claims, admins see all"
  on public.portfolio_claims for select
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Members request claims"
  on public.portfolio_claims for insert
  with check (user_id = (select auth.uid()));

create policy "Admins resolve claims"
  on public.portfolio_claims for delete
  using ((select public.is_admin()));

-- Instant claim when the signed-in email is the one we contacted them on.
create or replace function public.claim_portfolio_by_email(target uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  if my_email = '' or not exists (
    select 1 from public.portfolio_contacts c where c.portfolio_id = target and lower(c.email) = my_email
  ) then
    return false;
  end if;
  update public.portfolios set status = 'claimed', claimed_by = me
    where id = target and status = 'listed'
      and not exists (select 1 from public.portfolios p where p.claimed_by = me);
  return found;
end;
$$;

revoke all on function public.claim_portfolio_by_email(uuid) from public, anon;
grant execute on function public.claim_portfolio_by_email(uuid) to authenticated;

-- ---------- Removal ----------

create table public.portfolio_removals (
  id           uuid primary key default gen_random_uuid(),
  portfolio_id uuid references public.portfolios (id) on delete set null,
  email        text,
  reason       text check (char_length(reason) <= 1000),
  created_at   timestamptz not null default now()
);

alter table public.portfolio_removals enable row level security;

create policy "Admins read removal requests"
  on public.portfolio_removals for select
  using ((select public.is_admin()));

-- Anyone, signed in or not, can take an unclaimed listing down at once. A claimed one belongs
-- to a member, so only they (or an admin) can; anyone else's request waits for an admin.
create or replace function public.request_portfolio_removal(target uuid, contact text, why text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  current_status text;
  owner uuid;
begin
  select status, claimed_by into current_status, owner from public.portfolios where id = target;
  if current_status is null then
    return 'missing';
  end if;

  insert into public.portfolio_removals (portfolio_id, email, reason)
    values (target, nullif(left(trim(contact), 200), ''), nullif(left(trim(why), 1000), ''));

  if current_status = 'claimed' and owner is distinct from auth.uid() and not public.is_admin() then
    return 'pending';
  end if;

  update public.portfolios set status = 'removed', featured = false, claimed_by = null where id = target;
  insert into public.portfolio_contacts (portfolio_id, do_not_contact) values (target, true)
    on conflict (portfolio_id) do update set do_not_contact = true;
  return 'removed';
end;
$$;

grant execute on function public.request_portfolio_removal(uuid, text, text) to anon, authenticated;
