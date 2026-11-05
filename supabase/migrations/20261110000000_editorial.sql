-- Identify's write-ups, made independent switches. Any story an admin writes can:
--   * be about someone (a Discover listing or a member) or about no one in particular,
--   * be in a Discoveries section (feature_section) or not, and
--   * be on the home page's Featured tab (featured_at) or not.
-- So a post about a random project can be featured, and a feature about someone can be left off
-- Featured. Replaces set_project_feature(). Run after 20261109000000_discoveries_members.sql.

drop function if exists public.set_project_feature(uuid, uuid, text, boolean);
drop function if exists public.set_project_feature(uuid, uuid, uuid, text, boolean);

create or replace function public.set_project_editorial(
  target uuid, portfolio uuid, member uuid, section text, pick boolean, featured boolean
)
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
        about_member    = case when portfolio is null then member end,
        feature_section = section,
        -- Editor's pick leads Discoveries, so it needs a section.
        editors_pick    = section is not null and coalesce(pick, false),
        featured_at     = case when featured then coalesce(featured_at, now()) end
    where id = target;
end;
$$;

revoke all on function public.set_project_editorial(uuid, uuid, uuid, text, boolean, boolean) from public, anon;
grant execute on function public.set_project_editorial(uuid, uuid, uuid, text, boolean, boolean) to authenticated;

-- Discoveries is now "has a section", with or without a person.
drop index if exists public.projects_features_idx;
create index if not exists projects_features_idx on public.projects (editors_pick desc, published_at desc)
  where feature_section is not null and status = 'published';
