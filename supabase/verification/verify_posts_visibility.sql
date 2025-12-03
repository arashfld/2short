-- Verify posts RLS visibility

------------------------------
-- 1) Show current posts policies
------------------------------
select polname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'posts'
order by polname;

------------------------------
-- 2) Public posts should be visible without relying on auth.uid()
------------------------------
-- This query should return rows if public posts exist
select id, creator_id, title, required_tier_level
from public.posts
where required_tier_level = 0
order by created_at desc
limit 10;

------------------------------
-- 3) Simulate an authenticated creator seeing their own posts
------------------------------
-- Replace the sub claim with an actual creator UUID
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select auth.uid() as simulated_uid;
select id, title, required_tier_level
from public.posts
where creator_id = auth.uid()
order by created_at desc
limit 10;

------------------------------
-- 4) Simulate a subscriber seeing gated posts at or below their tier
------------------------------
-- Replace the sub claim with an actual subscriber UUID that has active subscriptions
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
select auth.uid() as simulated_uid;
select p.id, p.title, p.required_tier_level
from public.posts p
join public.subscriptions s
  on s.creator_id = p.creator_id
 and s.subscriber_id = auth.uid()
 and s.expires_at > now()
where s.tier_level >= p.required_tier_level
order by p.created_at desc
limit 10;

------------------------------
-- 5) Non-subscriber should NOT see gated posts (> 0)
------------------------------
-- Simulate a random user (no subscription) and attempt to read gated posts
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000004"}', true);
select auth.uid() as simulated_uid;
select id, title, required_tier_level
from public.posts
where required_tier_level > 0
order by created_at desc
limit 10;
-- Expect: 0 rows if RLS is correctly enforced