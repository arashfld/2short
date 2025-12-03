export type Role = 'fan' | 'creator'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: Role
  avatar_url: string | null
  profile_image_url: string | null
  banner_image_url: string | null
  bio: string | null
  feed_min_tier: number
  messages_min_tier: number
  created_at: string
}

export interface Tier {
  id: string
  creator_id: string
  level: number
  name: string
  description: string | null
  price_cents: number | null
  created_at: string
}

export interface Post {
  id: string
  creator_id: string
  slug: string
  title: string
  content: string | null
  image_url: string | null
  required_tier_level: number
  created_at: string
}

export interface Subscription {
  subscriber_id: string
  creator_id: string
  tier_level: number
  subscribed_at: string
  expires_at: string
}

export interface FeedMessage {
  id: string
  creator_id: string
  author_id: string
  body: string
  image_url: string | null
  visibility_min_tier: number
  created_at: string
}

export interface Conversation {
  id: string
  participant1_id: string
  participant2_id: string
  last_message_at: string
  created_at: string
}

export interface DirectMessage {
  id: string
  conversation_id: string
  sender_id: string
  recipient_id: string
  message_text: string
  created_at: string
  read_at: string | null
}

export interface ConversationWithDetails extends Conversation {
  other_participant: Profile
  last_message: DirectMessage | null
  unread_count: number
}