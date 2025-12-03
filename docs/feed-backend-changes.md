# Feed Tier Gating — Backend Changes

This document lists the backend updates required so creators can choose a single minimum subscription tier for their entire feed, and the frontend can work without per-message tier selection.

## Goals

- Add a global `feed_min_tier` on `profiles` for creators.
- Gate `feed_messages` reads by subscriber’s `subscriptions.tier_level >= profiles.feed_min_tier` (or creator viewing own feed).
- Keep posting simple: each feed message is public by default in data structure; access is enforced via RLS.

## Schema Changes (Supabase)

1) Add column to `profiles`:

```sql
alter table profiles
add column if not exists feed_min_tier integer not null default 0;
```

2) Optional: Deprecate per-message `visibility_min_tier` on `feed_messages`.

- Keep the column for now to avoid breaking existing data, but stop relying on it in RLS.
- Later, you can remove the column if desired:

```sql
-- optional cleanup
-- alter table feed_messages drop column visibility_min_tier;
```

## RLS Policies

Assuming tables:
- `profiles(id, role, feed_min_tier, ...)`
- `subscriptions(subscriber_id, creator_id, tier_level, expires_at, ...)`
- `feed_messages(id, creator_id, author_id, body, image_url, created_at, ...)`

Enable RLS if not already:

```sql
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table feed_messages enable row level security;
```

Policies for `feed_messages`:

1) Allow creators to read their own feed messages:

```sql
create policy "creator can read own feed"
on feed_messages
for select
to authenticated
using (auth.uid() = creator_id);
```

2) Allow fans to read a creator’s feed if subscribed at or above the creator’s `feed_min_tier` (and subscription is active):

```sql
create policy "subscribed fans can read creator feed"
on feed_messages
for select
to authenticated
using (
  exists (
    select 1
    from profiles p
    where p.id = feed_messages.creator_id
      and p.role = 'creator'
      and p.feed_min_tier <= coalesce(
        (
          select s.tier_level
          from subscriptions s
          where s.creator_id = feed_messages.creator_id
            and s.subscriber_id = auth.uid()
            and s.expires_at > now()
          limit 1
        ), -1
      )
  )
);
```

3) Allow public read if creator’s `feed_min_tier = 0` (no subscription required):

```sql
create policy "public can read feed when min tier is 0"
on feed_messages
for select
to public
using (
  exists (
    select 1 from profiles p
    where p.id = feed_messages.creator_id
      and p.feed_min_tier = 0
  )
);
```

4) Posting policy: only the creator may insert messages for their own feed:

```sql
create policy "creator can post to own feed"
on feed_messages
for insert
to authenticated
with check (auth.uid() = creator_id);
```

## Service Functions

Update the client code to stop sending `visibility_min_tier` per message. Keep `postFeedMessage` signature aligned with the table shape you decide:

```ts
// lib/supabase/types.ts
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'fan' | 'creator';
  avatar_url: string | null;
  profile_image_url: string | null;
  banner_image_url: string | null;
  bio: string | null;
  feed_min_tier: number; // NEW
  created_at: string;
}

export interface FeedMessage {
  id: string;
  creator_id: string;
  author_id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  // visibility_min_tier: number; // deprecated, do not use
}
```

Client insert now only uses creator_id, author_id, body, image_url.

```ts
// lib/supabase/service.ts
export async function postFeedMessage(input: {
  creator_id: string;
  author_id: string;
  body: string;
  image_url: string | null;
}) {
  const { data, error } = await sb
    .from('feed_messages')
    .insert(input)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as FeedMessage;
}
```

For settings, allow creators to update `feed_min_tier` on their profile:

```ts
// lib/supabase/service.ts
export async function updateProfile(id: string, patch: Partial<Profile>) { /* unchanged */ }
```

## Frontend Alignment (already implemented)

- FeedComposer no longer shows per-message tier; posts are created without extra gating.
- UI exposes a “مشاهده فید” button on the creator public profile and a “مشاهده صفحه فید” button on the creator dashboard.
- Side panel width reduced for a tighter layout.

## Rollout Steps

1. Apply schema migrations for `feed_min_tier` and RLS policies.
2. Update types and service function signatures as above.
3. Verify:
   - Public feed visible when `feed_min_tier = 0`.
   - Subscribed fan at tier N sees feed when `feed_min_tier <= N`.
   - Non-subscribed fans cannot read gated feed.
   - Creator can always read and post to own feed.

## Notes

- Keep `visibility_min_tier` on rows for backward compatibility until data is migrated. The new RLS ignores it.
- If you remove the column, update generated types and `postFeedMessage` signature accordingly.