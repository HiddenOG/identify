-- Account settings: let people delete their own account.
-- Run after 20261029000000_library_stats.sql.

-- Deleting the auth user cascades to the profile, projects, likes, comments, follows,
-- notifications, bookmarks and stats. Storage files are removed by the app first.
create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
