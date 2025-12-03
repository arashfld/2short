-- Migration: add profiles.feed_min_tier and update feed policies to gate by profile
-- Safe to re-run; uses IF EXISTS/IF NOT EXISTS where possible

alter table if exists public.profiles
  add column if not exists feed_min_tier int not null default 0;

-- Recreate feed select policies to use profiles.feed_min_tier
do $$
begin
  if exists (select 1 from pg_policy where polname = 'feed_select_public') then
    drop policy "feed_select_public" on public.feed_messages;
  end if;
  if exists (select 1 from pg_policy where polname = 'feed_select_subscribers') then
    drop policy "feed_select_subscribers" on public.feed_messages;
  end if;
end $$;

create policy "feed_select_public"
  on public.feed_messages
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = feed_messages.creator_id
        and p.feed_min_tier = 0
    )
  );

create policy "feed_select_subscribers"
  on public.feed_messages
  for select using (
    auth.uid() = feed_messages.creator_id OR
    exists (
      select 1
      from public.profiles p
      join public.subscriptions s on s.creator_id = p.id
      where p.id = feed_messages.creator_id
        and s.subscriber_id = auth.uid()
        and s.tier_level >= p.feed_min_tier
        and s.expires_at > now()
    )
  );