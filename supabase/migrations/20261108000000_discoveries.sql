-- Discoveries: editorial features Identify writes about someone's work. A feature is an ordinary
-- write-up (likes, responses, bookmarks, the read gate and link previews all come with it) that
-- is linked to the Discover listing of the person it's about, put in a section, and optionally
-- made the Editor's pick. Only admins can set those, through set_project_feature().
-- 20261109000000_discoveries_members.sql then lets a feature be about a member too.
--
-- Also the home feed's Featured tab, like Medium's: admins can feature any published story
-- (projects.featured_at, through set_project_featured()); Discoveries features are featured
-- automatically. The writer gets a "your story was featured" notification.
-- Run after 20261107000000_message_extras_grant.sql.

alter table public.projects
  add column about_portfolio uuid references public.portfolios (id) on delete set null,
  add column feature_section text check (feature_section in ('builders', 'projects', 'rising')),
  add column editors_pick    boolean not null default false,
  -- A section only makes sense on a feature.
  add constraint projects_feature_check check (
    (about_portfolio is null and feature_section is null and not editors_pick)
    or (about_portfolio is not null and feature_section is not null)
  );

alter table public.projects add column featured_at timestamptz;

create index projects_featured_idx on public.projects (featured_at desc)
  where featured_at is not null and status = 'published';

create index projects_features_idx on public.projects (editors_pick desc, published_at desc)
  where about_portfolio is not null and status = 'published';

-- No column grants for these: members can't turn their own write-ups into features.
create or replace function public.set_project_feature(target uuid, portfolio uuid, section text, pick boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can publish features';
  end if;
  if not exists (select 1 from public.projects where id = target and author_id = auth.uid()) then
    raise exception 'Project not found';
  end if;
  update public.projects
    set about_portfolio = portfolio,
        feature_section = case when portfolio is null then null else coalesce(section, 'projects') end,
        editors_pick    = portfolio is not null and coalesce(pick, false),
        -- Features always go on the home page's Featured tab.
        featured_at     = case when portfolio is not null then coalesce(featured_at, now()) else featured_at end
    where id = target;
end;
$$;

revoke all on function public.set_project_feature(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.set_project_feature(uuid, uuid, text, boolean) to authenticated;

-- Puts any story on (or takes it off) the home feed's Featured tab.
create or replace function public.set_project_featured(target uuid, on_home boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can feature stories';
  end if;
  update public.projects
    set featured_at = case when on_home then coalesce(featured_at, now()) else null end
    where id = target;
end;
$$;

revoke all on function public.set_project_featured(uuid, boolean) from public, anon;
grant execute on function public.set_project_featured(uuid, boolean) to authenticated;

-- ---------- Notifications ----------

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'follow', 'portfolio_claimed', 'portfolio_claim_request', 'featured', 'story_featured'));

-- "Your story was featured": once per story, from the admin who featured it.
create or replace function public.notify_story_featured()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.featured_at is not null and new.status = 'published'
    and (old.featured_at is null or old.status is distinct from 'published')
    and auth.uid() is not null and auth.uid() <> new.author_id
    and not exists (select 1 from public.notifications n where n.type = 'story_featured' and n.project_id = new.id)
  then
    insert into public.notifications (user_id, actor_id, type, project_id)
    values (new.author_id, auth.uid(), 'story_featured', new.id);
  end if;
  return null;
end;
$$;

create trigger projects_notify_story_featured
  after update of featured_at, status on public.projects
  for each row execute function public.notify_story_featured();

-- "Identify wrote about your work":

-- Tells the member behind a listing about each published feature on them, once.
create or replace function public.notify_featured(listing uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, actor_id, type, project_id, portfolio_id)
  select po.claimed_by, pr.author_id, 'featured', pr.id, po.id
  from public.projects pr
  join public.portfolios po on po.id = pr.about_portfolio
  where po.id = listing
    and po.claimed_by is not null
    and po.claimed_by <> pr.author_id
    and pr.status = 'published'
    and not exists (
      select 1 from public.notifications n
      where n.type = 'featured' and n.project_id = pr.id and n.user_id = po.claimed_by
    );
$$;

revoke all on function public.notify_featured(uuid) from public, anon, authenticated;

-- A feature is published about someone who has already claimed their listing...
create or replace function public.notify_featured_on_publish()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.about_portfolio is not null and new.status = 'published' then
    perform public.notify_featured(new.about_portfolio);
  end if;
  return null;
end;
$$;

create trigger projects_notify_featured
  after insert or update of status, about_portfolio on public.projects
  for each row execute function public.notify_featured_on_publish();

-- ...or someone claims a listing that already has features.
create or replace function public.notify_featured_on_claim()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.claimed_by is not null and new.claimed_by is distinct from old.claimed_by then
    perform public.notify_featured(new.id);
  end if;
  return null;
end;
$$;

create trigger portfolios_notify_featured
  after update of claimed_by on public.portfolios
  for each row execute function public.notify_featured_on_claim();

-- ---------- Removal takes the features down too ----------

-- Someone who asks to come off Discover shouldn't stay the subject of a published story.
-- The features go back to drafts (not deleted), so nothing is lost if it was a mistake.
create or replace function public.unpublish_features_on_removal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'removed' and old.status is distinct from 'removed' then
    update public.projects set status = 'draft', editors_pick = false, featured_at = null
      where about_portfolio = new.id and status = 'published';
  end if;
  return null;
end;
$$;

create trigger portfolios_unpublish_features
  after update of status on public.portfolios
  for each row execute function public.unpublish_features_on_removal();
