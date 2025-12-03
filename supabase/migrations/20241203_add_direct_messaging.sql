-- Add direct messaging system
-- Created: 2024-12-03

-- Add messages_min_tier to profiles (controls which tier can send messages to creator)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS messages_min_tier INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.messages_min_tier IS 'Minimum subscription tier required to send direct messages to this creator (0 = all subscribers)';

-- Create conversations table
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

-- Create indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON public.conversations (participant1_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON public.conversations (participant2_id, last_message_at DESC);

-- Create direct_messages table
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

-- Create indexes for direct_messages
CREATE INDEX IF NOT EXISTS idx_dm_conversation ON public.direct_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_sender ON public.direct_messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_recipient ON public.direct_messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_unread ON public.direct_messages (recipient_id, read_at) WHERE read_at IS NULL;

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Users can only see conversations they're part of
CREATE POLICY IF NOT EXISTS "conversations_select_participant" 
  ON public.conversations
  FOR SELECT USING (
    auth.uid() = participant1_id OR auth.uid() = participant2_id
  );

-- Users can create conversations they're part of
CREATE POLICY IF NOT EXISTS "conversations_insert_participant" 
  ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() = participant1_id OR auth.uid() = participant2_id
  );

-- Users can update conversations they're part of (for last_message_at)
CREATE POLICY IF NOT EXISTS "conversations_update_participant" 
  ON public.conversations
  FOR UPDATE USING (
    auth.uid() = participant1_id OR auth.uid() = participant2_id
  );

-- Enable RLS on direct_messages
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or received
CREATE POLICY IF NOT EXISTS "dm_select_participant" 
  ON public.direct_messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

-- Users can send messages (permission checking done at application level)
CREATE POLICY IF NOT EXISTS "dm_insert_sender" 
  ON public.direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update (mark as read) messages they received
CREATE POLICY IF NOT EXISTS "dm_update_recipient" 
  ON public.direct_messages
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Function to update conversation's last_message_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation timestamp on new message
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON public.direct_messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();
