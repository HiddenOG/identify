-- Claim requests replace the "put a code on your site" check: someone whose sign-in email isn't
-- the one we contacted asks to claim, optionally with a note, and an admin approves by hand.
-- Run after 20261104000000_discover_activity.sql.

alter table public.portfolio_claims
  add column note text check (char_length(note) <= 500);
