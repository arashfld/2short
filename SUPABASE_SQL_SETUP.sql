-- =====================================================
-- SUPABASE SQL MIGRATION FOR DIRECT MESSAGING SYSTEM
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- Step 1: Add messages_min_tier column to profiles
-- This controls which tier of subscribers can send messages to a creator
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS messages_min_tier INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.messages_min_tier IS 'Minimum subscription tier required to send direct messages to this creator (0 = all subscribers)';

-- Step 2: Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique conversation pairs (bidirectional)
  CONSTRAINT unique_conversation UNIQUE (
    LEAST(participant1_id, participant2_id),
    GREATEST(participant1_id, participant2_id)
  )
);

-- Step 3: Create indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON public.conversations (participant1_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON public.conversations (participant2_id, last_message_at DESC);

-- Step 4: Create direct_messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  
  CONSTRAINT message_text_length CHECK (char_length(message_text) > 0 AND char_length(message_text) <= 5000)
);

-- Step 5: Create indexes for direct_messages
CREATE INDEX IF NOT EXISTS idx_dm_conversation ON public.direct_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_sender ON public.direct_messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_recipient ON public.direct_messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_unread ON public.direct_messages (recipient_id, read_at) WHERE read_at IS NULL;

-- Step 6: Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for conversations
DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
CREATE POLICY "conversations_select_participant" 
  ON public.conversations
  FOR SELECT USING (
    auth.uid() = participant1_id OR auth.uid() = participant2_id
  );

DROP POLICY IF EXISTS "conversations_insert_participant" ON public.conversations;
CREATE POLICY "conversations_insert_participant" 
  ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() = participant1_id OR auth.uid() = participant2_id
  );

DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;
CREATE POLICY "conversations_update_participant" 
  ON public.conversations
  FOR UPDATE USING (
    auth.uid() = participant1_id OR auth.uid() = participant2_id
  );

-- Step 8: Enable RLS on direct_messages
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies for direct_messages
DROP POLICY IF EXISTS "dm_select_participant" ON public.direct_messages;
CREATE POLICY "dm_select_participant" 
  ON public.direct_messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

DROP POLICY IF EXISTS "dm_insert_sender" ON public.direct_messages;
CREATE POLICY "dm_insert_sender" 
  ON public.direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "dm_update_recipient" ON public.direct_messages;
CREATE POLICY "dm_update_recipient" 
  ON public.direct_messages
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Step 10: Create function to update conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Create trigger to auto-update conversation timestamp
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON public.direct_messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- =====================================================
-- VERIFICATION QUERIES (Optional - Run to verify)
-- =====================================================

-- Check if messages_min_tier column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'messages_min_tier';

-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'direct_messages');

-- Check if indexes were created
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('conversations', 'direct_messages');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('conversations', 'direct_messages');

-- =====================================================
-- DONE! Your messaging system is ready to use.
-- =====================================================
