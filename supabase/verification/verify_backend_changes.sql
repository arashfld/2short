-- Verification Script: Supabase Backend Changes
-- Purpose: Verify profile-level feed gating, indexes, and RLS policies.
-- How to Run: Paste into Supabase Studio > SQL editor and execute.
-- Notes:
-- - This script is read-only. It inspects schema, policies, and indexes.
-- - RLS policies are not executed here; we validate their presence and simulate logic.

------------------------------
-- 1) Column existence checks
------------------------------
-- Ensure profiles.feed_min_tier exists
select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'feed_min_tier';

-- Confirm visibility_min_tier still exists in feed_messages (for reference)
select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'feed_messages'
  and column_name = 'visibility_min_tier';

------------------------------
-- 2) RLS policies presence & duplication check
------------------------------
-- Feed policies: expect feed_select_public, feed_select_subscribers, insert/update/delete creator
select polname, schemaname, tablename, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'feed_messages'
order by polname;

-- Duplicates on feed policies (should return zero rows)
select polname, count(*) as duplicates
from pg_policies
where schemaname = 'public' and tablename = 'feed_messages'
group by polname
having count(*) > 1;

-- Posts policies: expect posts_select_public, posts_select_subscribers, posts_select_creator + CRUD
select polname, schemaname, tablename, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'posts'
order by polname;

-- Duplicates on posts policies (should return zero rows)
select polname, count(*) as duplicates
from pg_policies
where schemaname = 'public' and tablename = 'posts'
group by polname
having count(*) > 1;

------------------------------
-- 3) Index presence and duplication checks
------------------------------
-- Single-column indexes expected
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'feed_messages'
  and (indexdef ilike '%(creator_id)%' or indexdef ilike '%(created_at)%')
order by indexname;

-- Composite index on (creator_id, created_at) presence
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'feed_messages'
  and indexdef ilike '%(creator_id, created_at)%';

-- Count composite index duplicates (should be 1 or 0)
select count(*) as composite_index_count
from pg_indexes
where schemaname = 'public'
  and tablename = 'feed_messages'
  and indexdef ilike '%(creator_id, created_at)%';

------------------------------
-- 4) Query plan check (index usage)
------------------------------
-- Replace the UUIDs below with actual creator IDs present in your data.
-- Expect an index scan using creator_id and ordering by created_at.
explain analyze
select *
from public.feed_messages
where creator_id = '00000000-0000-0000-0000-000000000000'
order by created_at desc
limit 10;

------------------------------
-- 5) Simulated feed gating (profile-level) logic
------------------------------
-- Replace :subscriber_uuid and :creator_uuid with actual UUIDs to simulate gating logic.
-- This does NOT execute RLS; it mirrors the policy conditions to validate expected results.
with params as (
  select
    '00000000-0000-0000-0000-000000000001'::uuid as subscriber_uuid,
    '00000000-0000-0000-0000-000000000002'::uuid as creator_uuid
)
select fm.id, fm.created_at, p.feed_min_tier, s.tier_level,
  case
    when p.feed_min_tier = 0 then 'public'
    when params.subscriber_uuid = fm.creator_id then 'creator'
    when s.tier_level >= p.feed_min_tier and s.expires_at > now() then 'subscriber'
    else 'locked'
  end as access_reason
from public.feed_messages fm
join public.profiles p on p.id = fm.creator_id
left join public.subscriptions s
  on s.creator_id = p.id
 and s.subscriber_id = (select subscriber_uuid from params)
where fm.creator_id = (select creator_uuid from params)
order by fm.created_at desc
limit 20;

------------------------------
-- 6) Posts RLS quick sanity
------------------------------
-- Ensure posts_select_public exists and required_tier_level is default 0 for public posts
select polname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'posts' and polname = 'posts_select_public';

-- Spot-check a public post (replace creator and slug)
select id, creator_id, slug, required_tier_level
from public.posts
where creator_id = '00000000-0000-0000-0000-000000000002'
  and slug = 'sample-slug';

------------------------------
-- 7) Storage buckets sanity (optional)
------------------------------
-- Confirm public buckets exist (if schema.sql created them)
select id, name, public
from storage.buckets
where id in ('profile-assets', 'post-assets');

-- End of verification script