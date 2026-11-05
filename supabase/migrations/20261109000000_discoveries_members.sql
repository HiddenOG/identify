-- Discoveries about anyone: a feature can be about an Identify member (about_member), not only
-- someone on Discover, so Identify can write about members' and non-members' projects alike.
-- ("Someone new" in the editor lists the person on Discover first, so it uses about_portfolio.)
-- Run after 20261108000000_discoveries.sql.

alter table public.projects
  add column about_member uuid references public.profiles (id) on delete set null;

-- A feature is about one person. The old check also tied the section to about_portfolio, which
-- would have blocked deleting a listing or account that a feature is about; the app now treats
-- a write-up with neither link as a normal one.
alter table public.projects drop constraint projects_feature_check;
alter table public.projects add constraint projects_feature_check
  check (about_portfolio is null or about_member is null);

drop index if exists public.projects_features_idx;
create index projects_features_idx on public.projects (editors_pick desc, published_at desc)
  where (about_portfolio is not null or about_member is not null) and status = 'published';

-- Same RPC, now with a member.
drop function if exists public.set_project_feature(uuid, uuid, text, boolean);

create or replace function public.set_project_feature(target uuid, portfolio uuid, member uuid, section text, pick boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  is_feature boolean := portfolio is not null or member is not null;
begin
  if not public.is_admin() then
    raise exception 'Only admins can publish features';
  end if;
  if not exists (select 1 from public.projects where id = target and author_id = auth.uid()) then
    raise exception 'Project not found';
  end if;
  update public.projects
    set about_portfolio = portfolio,
        about_member    = case when portfolio is null then member end,
        feature_section = case when is_feature then coalesce(section, 'projects') end,
        editors_pick    = is_feature and coalesce(pick, false),
        -- Features always go on the home page's Featured tab.
        featured_at     = case when is_feature then coalesce(featured_at, now()) else featured_at end
    where id = target;
end;
$$;

revoke all on function public.set_project_feature(uuid, uuid, uuid, text, boolean) from public, anon;
grant execute on function public.set_project_feature(uuid, uuid, uuid, text, boolean) to authenticated;

-- A feature about a member tells them as soon as it's published.
create or replace function public.notify_featured_on_publish()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and new.about_portfolio is not null then
    perform public.notify_featured(new.about_portfolio);
  elsif new.status = 'published' and new.about_member is not null and new.about_member <> new.author_id
    and not exists (
      select 1 from public.notifications n
      where n.type = 'featured' and n.project_id = new.id and n.user_id = new.about_member
    )
  then
    insert into public.notifications (user_id, actor_id, type, project_id)
    values (new.about_member, new.author_id, 'featured', new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists projects_notify_featured on public.projects;
create trigger projects_notify_featured
  after insert or update of status, about_portfolio, about_member on public.projects
  for each row execute function public.notify_featured_on_publish();
