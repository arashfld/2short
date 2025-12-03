# Backend Connections Checklist

This document maps key app routes to their backend integrations and RLS expectations, helping you quickly spot gaps and wire things up correctly.

## Supabase Setup
- Project configured with `public` schema and RLS enabled.
- Tables relevant here: `profiles`, `tiers`, `subscriptions`, `feed_messages`, `posts`.
- Storage bucket for images (e.g., `public`) with public read access as needed.

## RLS Policies Overview
- `profiles`: creators and fans readable; updates restricted to the profile owner.
- `feed_messages`: read gated by creator’s `profiles.feed_min_tier` and subscriber tier; write restricted to creators.
- `subscriptions`: insert by the subscriber; read filtered by `subscriber_id`.
- `tiers`: readable; managed by creators.
- `posts`: readable based on `required_tier_level`; write restricted to creators.

## App Routes and Backend Hooks

- `/creators/[creatorId]/feed`
  - UI uses `listFeedMessages(creatorId)` with RLS enforcing access.
  - Composer uses `postFeedMessage({ creatorId, authorId, body, image_url })`.
  - Image uploads use Supabase Storage; public URL passed separately via `image_url`.

- `/creators/[creatorId]/subscribe`
  - Fetch creator with `getProfile(creatorId)` and show tiers via `getCreatorTiers(creatorId)`.
  - Subscriptions handled by `subscribeToCreator(creatorId, level, userId)`.
  - Displays creator header and bio for context.

- `(creator_dashboard)/dashboard/creator/settings`
  - Persists `profiles.feed_min_tier` to control minimum feed access tier.
  - General profile fields (name, avatar, bio) updated via `updateProfile`.

- `(creator_dashboard)/dashboard/creator/analytics`
  - Placeholder UI exists; backend endpoints TBD.
  - Future: aggregate reads across `feed_messages`, `posts`, and `subscriptions`.

## Missing or To‑Do Connections
- Analytics data endpoints and queries are not yet implemented.
- Consider server-side validation for subscription tier changes.

## How to Use
- When adding or updating a route, list its backend calls here and verify RLS logic matches the UI expectations.
- Keep this checklist updated as you add features to avoid drift between UI, service layer, and database policies.