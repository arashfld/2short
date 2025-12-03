# Temporary Backend Changes

This file tracks temporary modifications made to the frontend code that will need to be revisited when the backend is fully connected.

## Fan Sign-up (`src/components/signup-form.tsx`)

- **Change**: The form submission logic is a placeholder that does not create a user account. It redirects to the dashboard.
- **Reason**: To allow frontend development of the fan sign-up flow without a backend.
- **To-Do**: Implement user creation logic with Firebase Authentication.

## Fan Login (`src/components/login-form.tsx`)

- **Change**: The form submission logic is a placeholder that does not authenticate a user. It redirects to the dashboard.
- **Reason**: To allow frontend development of the fan login flow without a backend.
- **To-Do**: Implement user sign-in logic with Firebase Authentication.

## Dashboard Access (`src/app/dashboard/layout.tsx`)

- **Change**: The dashboard layout does not currently check if a user is authenticated. It allows public access.
- **Reason**: To allow development of the dashboard UI without a functioning authentication flow.
- **To-Do**: Add a check to redirect unauthenticated users from the dashboard back to the homepage.

## Posts API (`src/app/api/supabase/posts/route.ts`)

- **Change**: Added `DELETE` handler to allow creators to delete their own posts.
- **Behavior**:
  - Request body: `{ creatorEmail: string, postId: string }`.
  - Validates the creator profile by email (`role = 'creator'`).
  - Deletes only when the post belongs to the creator (`creator_id` check).
  - Responses:
    - `200 { ok: true }` on success.
    - `400` for missing fields.
    - `404` if post not found or not owned by the creator.
    - `500` for Supabase errors.
- **To-Do**: If using RLS, ensure appropriate policies allow service role deletion; otherwise, continue using the service client.

## Create Post Redirect (`src/app/(creator_dashboard)/dashboard/creator/create/page.tsx`)

- **Change**: Redirect after successful post creation now goes to `/dashboard/creator/posts` (posts management) instead of the public feed.
- **Reason**: Keeps creators in the management flow after creating content.
- **To-Do**: If different behavior is preferred (e.g., stay on Create or go to the new post page), adjust the route accordingly.

## Feed Gating (Supabase)

- **Change**: Introduced `profiles.feed_min_tier int not null default 0` to define the minimum tier required to view a creator’s live feed. Feed RLS policies now gate reads by this profile-level setting rather than per-message values.
- **Behavior**:
  - Public feed when `feed_min_tier = 0`.
  - Subscribers can read when their `subscriptions.tier_level >= profiles.feed_min_tier` and subscription is active.
  - Creator can always read their own feed.
- **Schema/Policies**:
  - Column added in `supabase/schema.sql` and a migration created at `supabase/migrations/20251008_add_feed_min_tier.sql`.
  - Policies `feed_select_public` and `feed_select_subscribers` updated to use `profiles.feed_min_tier`.
- **Frontend Alignment**:
  - Settings page adds a control for minimum feed tier and saves it on profile.
  - Feed composer sends optional `image_url` separately; feed UI no longer shows per-message tier.
- **To-Do**:
  - Apply migration: run `supabase db push` or execute the SQL file against your project.
  - If you prefer per-message gating, keep `visibility_min_tier` policies; otherwise, proceed with profile-level gating.

## Posts RLS (Supabase)

- **Issue**: Public posts appearing locked on the post detail page indicate missing or misconfigured read policies for `public.posts`.
- **Fix**: Ensure RLS is enabled and the following policies exist. These allow:
  - Public reads for `required_tier_level = 0`.
  - Creator reads of their own posts.
  - Subscriber reads when their active subscription tier meets or exceeds the post’s requirement.
- **SQL**:
  ```sql
  -- Enable RLS on posts
  alter table public.posts enable row level security;

  -- Allow public reads for public posts
  create policy if not exists "posts_select_public"
    on public.posts for select
    using (required_tier_level = 0);

  -- Allow creators to read their own posts
  create policy if not exists "posts_select_creator"
    on public.posts for select
    using (auth.uid() = creator_id);

  -- Allow subscribers to read posts at/under their tier while subscription is active
  create policy if not exists "posts_select_subscribers"
    on public.posts for select
    using (
      exists (
        select 1
        from public.subscriptions s
        where s.creator_id = posts.creator_id
          and s.subscriber_id = auth.uid()
          and s.tier_level >= posts.required_tier_level
          and s.expires_at > now()
      )
    );
  ```
- **Notes**:
  - These policies are already present in `supabase/schema.sql`. If your remote project is missing them, apply the SQL above in the Supabase SQL editor or add a migration.
  - Confirm that created public posts have `required_tier_level = 0`.
  - If public posts still show locked, verify the policies exist in your target Supabase project and that RLS is enabled on `public.posts`.
