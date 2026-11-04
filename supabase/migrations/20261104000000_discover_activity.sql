-- Discover activity: what happens after an invite goes out (claim link opened, claimed, claim
-- requested with a site code, removed, invited), for the admin page, plus bell notifications to
-- admins when someone claims. Run after 20261102000000_discover.sql.

create table public.portfolio_events (
  id           bigint generated always as identity primary key,
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  kind         text not null check (kind in ('claim_view', 'claimed', 'claim_requested', 'removed', 'invited')),
  user_id      uuid references public.profiles (id) on delete set null,
  -- An anonymous per-browser id (the bf_vid cookie), so repeat opens by one person can be told apart.
  visitor      text check (char_length(visitor) <= 64),
  created_at   timestamptz not null default now()
);

create index portfolio_events_listing_idx on public.portfolio_events (portfolio_id, created_at desc);
create index portfolio_events_recent_idx on public.portfolio_events (created_at desc);

alter table public.portfolio_events enable row level security;

create policy "Admins read Discover activity"
  on public.portfolio_events for select
  using ((select public.is_admin()));

-- Opening a claim link, from anyone. One row per visitor per listing per 30 minutes, so a refresh
-- isn't counted as another open. Only live listings count.
create or replace function public.record_portfolio_view(target uuid, visitor_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.portfolios where id = target and status in ('listed', 'claimed')) then
    return;
  end if;
  if visitor_id is not null and exists (
    select 1 from public.portfolio_events
    where portfolio_id = target and kind = 'claim_view' and visitor = left(visitor_id, 64)
      and created_at > now() - interval '30 minutes'
  ) then
    return;
  end if;
  insert into public.portfolio_events (portfolio_id, kind, user_id, visitor)
    values (target, 'claim_view', auth.uid(), left(visitor_id, 64));
end;
$$;

grant execute on function public.record_portfolio_view(uuid, text) to anon, authenticated;

-- ---------- Bell notifications for admins ----------

alter table public.notifications add column portfolio_id uuid references public.portfolios (id) on delete cascade;
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'follow', 'portfolio_claimed', 'portfolio_claim_request'));

create or replace function public.notify_admins(kind text, actor uuid, listing uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, actor_id, type, portfolio_id)
  select a.user_id, actor, kind, listing
  from public.admins a
  join public.profiles p on p.id = a.user_id
  where a.user_id is distinct from actor;
$$;

revoke all on function public.notify_admins(text, uuid, uuid) from public, anon, authenticated;

-- ---------- Triggers that write the log ----------

create or replace function public.log_portfolio_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'claimed' and old.status is distinct from 'claimed' then
    insert into public.portfolio_events (portfolio_id, kind, user_id) values (new.id, 'claimed', new.claimed_by);
    if new.claimed_by is not null then
      perform public.notify_admins('portfolio_claimed', new.claimed_by, new.id);
    end if;
  elsif new.status = 'removed' and old.status is distinct from 'removed' then
    insert into public.portfolio_events (portfolio_id, kind, user_id) values (new.id, 'removed', auth.uid());
  end if;
  return null;
end;
$$;

create trigger portfolios_log
  after update of status on public.portfolios
  for each row execute function public.log_portfolio_change();

create or replace function public.log_portfolio_claim_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.portfolio_events (portfolio_id, kind, user_id) values (new.portfolio_id, 'claim_requested', new.user_id);
  perform public.notify_admins('portfolio_claim_request', new.user_id, new.portfolio_id);
  return null;
end;
$$;

create trigger portfolio_claims_log
  after insert on public.portfolio_claims
  for each row execute function public.log_portfolio_claim_request();

create or replace function public.log_portfolio_invite()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.invited_at is not null and new.invited_at is distinct from old.invited_at then
    insert into public.portfolio_events (portfolio_id, kind, user_id) values (new.portfolio_id, 'invited', auth.uid());
  end if;
  return null;
end;
$$;

create trigger portfolio_contacts_log
  after update of invited_at on public.portfolio_contacts
  for each row execute function public.log_portfolio_invite();
