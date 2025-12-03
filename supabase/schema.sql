-- Supabase MVP schema and RLS policies for tier-gated content

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text check (role in ('fan','creator')) default 'fan',
  avatar_url text,
  profile_image_url text,
  banner_image_url text,
  bio text,
  feed_min_tier int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Allow users to view their own profile
create policy if not exists "profiles_select_self"
  on public.profiles
  for select using (auth.uid() = id);

-- Allow everyone to view creators (for Explore)
create policy if not exists "profiles_select_creators"
  on public.profiles
  for select using (role = 'creator');

-- Allow a user to insert/update their own profile
create policy if not exists "profiles_upsert_self"
  on public.profiles
  for insert with check (auth.uid() = id);

create policy if not exists "profiles_update_self"
  on public.profiles
  for update using (auth.uid() = id);

-- TIERS
create table if not exists public.tiers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  level int not null check (level between 0 and 3), -- 0=public
  name text not null,
  description text,
  price_cents int,
  created_at timestamptz not null default now(),
  unique (creator_id, level)
);

alter table public.tiers enable row level security;

-- Anyone can read tiers for creators
create policy if not exists "tiers_select_all"
  on public.tiers
  for select using (true);

-- Only creator can manage their tiers
create policy if not exists "tiers_insert_creator"
  on public.tiers
  for insert with check (auth.uid() = creator_id);

create policy if not exists "tiers_update_creator"
  on public.tiers
  for update using (auth.uid() = creator_id);

create policy if not exists "tiers_delete_creator"
  on public.tiers
  for delete using (auth.uid() = creator_id);

-- POSTS
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null,
  title text not null,
  content text,
  image_url text,
  required_tier_level int not null default 0,
  created_at timestamptz not null default now(),
  unique (creator_id, slug)
);

alter table public.posts enable row level security;

-- Allow public posts to be read by anyone
create policy if not exists "posts_select_public"
  on public.posts
  for select using (required_tier_level = 0);

-- Allow subscribers to read gated posts at or above their tier
create policy if not exists "posts_select_subscribers"
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

-- Allow creators to read/manage their own posts
create policy if not exists "posts_select_creator"
  on public.posts
  for select using (auth.uid() = creator_id);

create policy if not exists "posts_insert_creator"
  on public.posts
  for insert with check (auth.uid() = creator_id);

create policy if not exists "posts_update_creator"
  on public.posts
  for update using (auth.uid() = creator_id);

create policy if not exists "posts_delete_creator"
  on public.posts
  for delete using (auth.uid() = creator_id);

-- SUBSCRIPTIONS
create table if not exists public.subscriptions (
  subscriber_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  tier_level int not null check (tier_level between 1 and 3),
  subscribed_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  primary key (subscriber_id, creator_id)
);

alter table public.subscriptions enable row level security;

-- Only subscriber can view/manage their subscriptions
create policy if not exists "subs_select_self"
  on public.subscriptions
  for select using (auth.uid() = subscriber_id);

create policy if not exists "subs_insert_self"
  on public.subscriptions
  for insert with check (auth.uid() = subscriber_id);

create policy if not exists "subs_update_self"
  on public.subscriptions
  for update using (auth.uid() = subscriber_id);

create policy if not exists "subs_delete_self"
  on public.subscriptions
  for delete using (auth.uid() = subscriber_id);

-- LIVE FEED MESSAGES (optional MVP)
create table if not exists public.feed_messages (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  image_url text,
  visibility_min_tier int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.feed_messages enable row level security;

-- Read rules: public or subscriber tier >= visibility_min_tier, or creator
create policy if not exists "feed_select_public"
  on public.feed_messages
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = feed_messages.creator_id
        and p.feed_min_tier = 0
    )
  );

create policy if not exists "feed_select_subscribers"
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

-- Write rules: only the creator can post messages
create policy if not exists "feed_insert_creator"
  on public.feed_messages
  for insert with check (auth.uid() = creator_id and auth.uid() = author_id);

create policy if not exists "feed_update_creator"
  on public.feed_messages
  for update using (auth.uid() = author_id);

create policy if not exists "feed_delete_creator"
  on public.feed_messages
  for delete using (auth.uid() = author_id);

-- Helpful indexes
create index if not exists posts_creator_idx on public.posts (creator_id, required_tier_level);
create index if not exists subs_lookup_idx on public.subscriptions (subscriber_id, creator_id);
create index if not exists feed_creator_idx on public.feed_messages (creator_id, created_at);
-- Backfill: add columns if table already exists
alter table if exists public.profiles add column if not exists profile_image_url text;
alter table if exists public.profiles add column if not exists banner_image_url text;
alter table if exists public.profiles add column if not exists feed_min_tier int not null default 0;
alter table if exists public.subscriptions add column if not exists expires_at timestamptz not null default (now() + interval '30 days');

-- Allow creators to view subscriptions to their profile
create policy if not exists "subs_select_creator"
  on public.subscriptions
  for select using (auth.uid() = creator_id);

-- Allow creators to view subscriber profiles for their own subscribers
create policy if not exists "profiles_select_creator_subscribers"
  on public.profiles
  for select using (
    exists (
      select 1 from public.subscriptions s
      where s.subscriber_id = profiles.id
        and s.creator_id = auth.uid()
        and s.expires_at > now()
    )
    or auth.uid() = profiles.id
    or role = 'creator'
  );

-- Create storage bucket for profile and banner assets (public)
insert into storage.buckets (id, name, public)
values ('profile-assets', 'profile-assets', true)
on conflict (id) do nothing;

-- Create storage bucket for post images (public)
insert into storage.buckets (id, name, public)
values ('post-assets', 'post-assets', true)
on conflict (id) do nothing;

-- Storage policies: allow authenticated users to manage objects in public buckets
-- Note: for MVP we allow any authenticated user to insert/update/delete in these buckets.
-- You may tighten to per-user folders later using split_part(object_name,'/',1) = auth.uid()::text
do $$
begin
  if not exists (
    select 1 from pg_policy where polname = 'storage_profile_assets_insert'
  ) then
    create policy "storage_profile_assets_insert"
      on storage.objects for insert
      using (bucket_id = 'profile-assets' and auth.uid() is not null)
      with check (bucket_id = 'profile-assets' and auth.uid() is not null);
  end if;
  if not exists (
    select 1 from pg_policy where polname = 'storage_profile_assets_update'
  ) then
    create policy "storage_profile_assets_update"
      on storage.objects for update
      using (bucket_id = 'profile-assets' and auth.uid() is not null);
  end if;
  if not exists (
    select 1 from pg_policy where polname = 'storage_profile_assets_delete'
  ) then
    create policy "storage_profile_assets_delete"
      on storage.objects for delete
      using (bucket_id = 'profile-assets' and auth.uid() is not null);
  end if;
  if not exists (
    select 1 from pg_policy where polname = 'storage_profile_assets_select'
  ) then
    create policy "storage_profile_assets_select"
      on storage.objects for select
      using (bucket_id = 'profile-assets');
  end if;

  if not exists (
    select 1 from pg_policy where polname = 'storage_post_assets_insert'
  ) then
    create policy "storage_post_assets_insert"
      on storage.objects for insert
      using (bucket_id = 'post-assets' and auth.uid() is not null)
      with check (bucket_id = 'post-assets' and auth.uid() is not null);
  end if;
  if not exists (
    select 1 from pg_policy where polname = 'storage_post_assets_update'
  ) then
    create policy "storage_post_assets_update"
      on storage.objects for update
      using (bucket_id = 'post-assets' and auth.uid() is not null);
  end if;
  if not exists (
    select 1 from pg_policy where polname = 'storage_post_assets_delete'
  ) then
    create policy "storage_post_assets_delete"
      on storage.objects for delete
      using (bucket_id = 'post-assets' and auth.uid() is not null);
  end if;
  if not exists (
    select 1 from pg_policy where polname = 'storage_post_assets_select'
  ) then
    create policy "storage_post_assets_select"
      on storage.objects for select
      using (bucket_id = 'post-assets');
  end if;
end $$;