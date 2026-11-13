-- Claim codes: every contacted listing gets a private code that goes in its invite link
-- (/discover/claim/<id>?t=<code>). Opening the link from the email proves it reached them, so they
-- can claim with any account (Google included) straight away, with no matching email and no
-- waiting for an admin. Links without a code keep working the old way.
-- Run after 20261111000000_story_broadcast.sql.

alter table public.portfolio_contacts
  add column claim_token text unique default replace(gen_random_uuid()::text, '-', '');

update public.portfolio_contacts set claim_token = replace(gen_random_uuid()::text, '-', '') where claim_token is null;

create or replace function public.claim_portfolio_by_token(target uuid, token text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  if coalesce(length(token), 0) < 24 or not exists (
    select 1 from public.portfolio_contacts c where c.portfolio_id = target and c.claim_token = token
  ) then
    return false;
  end if;
  update public.portfolios set status = 'claimed', claimed_by = me
    where id = target and status = 'listed'
      and not exists (select 1 from public.portfolios p where p.claimed_by = me);
  return found;
end;
$$;

revoke all on function public.claim_portfolio_by_token(uuid, text) from public, anon;
grant execute on function public.claim_portfolio_by_token(uuid, text) to authenticated;
