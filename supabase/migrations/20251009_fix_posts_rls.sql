-- Migration: Fix posts RLS to ensure public posts are visible and subscribers are properly gated
-- Safe to re-run; uses IF EXISTS drops and recreates policies deterministically

-- Ensure RLS is enabled on posts
alter table if exists public.posts enable row level security;

-- Drop existing posts SELECT policies if present (safe, idempotent)
drop policy if exists "posts_select_public" on public.posts;
drop policy if exists "posts_select_subscribers" on public.posts;
drop policy if exists "posts_select_creator" on public.posts;

-- Allow public posts to be read by anyone
create policy "posts_select_public"
  on public.posts
  for select using (required_tier_level = 0);

-- Allow subscribers to read gated posts when their tier meets/exceeds requirement and subscription is active
create policy "posts_select_subscribers"
  on public.posts
  for select using (
    exists (
      select 1 from public.subscriptions s
      where s.creator_id = posts.creator_id
        and s.subscriber_id = auth.uid()
        and s.tier_level >= posts.required_tier_level
        and s.expires_at > now()
    )
  );

-- Allow creators to read their own posts
create policy "posts_select_creator"
  on public.posts
  for select using (auth.uid() = creator_id);