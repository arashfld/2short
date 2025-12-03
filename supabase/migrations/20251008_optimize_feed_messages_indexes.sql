-- Optimize feed_messages query performance
-- Adds indexes used by listFeedMessages (creator_id filter and created_at ordering)

create index if not exists idx_feed_messages_creator on public.feed_messages (creator_id);
create index if not exists idx_feed_messages_created_at on public.feed_messages (created_at);

-- Avoid duplicate composite index when an index with the same columns already exists (any name)
DO $$
DECLARE
  exists_same_columns BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'feed_messages'
      AND indexdef ILIKE '%(creator_id, created_at)%'
  ) INTO exists_same_columns;

  IF NOT exists_same_columns THEN
    CREATE INDEX IF NOT EXISTS idx_feed_messages_creator_created_at
      ON public.feed_messages (creator_id, created_at);
  END IF;
END $$;