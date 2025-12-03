import { supabase } from '../supabase'
import type { Profile, Post, Subscription, Tier, FeedMessage, Conversation, DirectMessage, ConversationWithDetails } from './types'

const hasClient = !!supabase
const sb = supabase!

// Profiles
export async function getProfile(id: string): Promise<Profile | null> {
  if (!hasClient) return null
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
  if (!hasClient) throw new Error('Supabase client not configured')
  const { data, error } = await sb
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data as Profile
}

export async function updateProfile(id: string, patch: Partial<Profile>): Promise<Profile> {
  if (!hasClient) throw new Error('Supabase client not configured')
  const { data, error } = await sb
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data as Profile
}

export async function listCreators(): Promise<Profile[]> {
  if (!hasClient) return []
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('role', 'creator')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Profile[]
}

// Tiers
export async function getCreatorTiers(creatorId: string): Promise<Tier[]> {
  if (!hasClient) return []
  const { data, error } = await sb
    .from('tiers')
    .select('*')
    .eq('creator_id', creatorId)
    .order('level')
  if (error) throw error
  return data as Tier[]
}

export async function upsertTier(input: {
  creator_id: string
  level: number
  name: string
  description?: string | null
  price_cents?: number | null
}): Promise<Tier> {
  if (!hasClient) throw new Error('Supabase client not configured')
  const { data, error } = await sb
    .from('tiers')
    .upsert(input, { onConflict: 'creator_id,level' })
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data as Tier
}

export async function deleteTier(creatorId: string, level: number): Promise<void> {
  if (!hasClient) return
  const { error } = await sb
    .from('tiers')
    .delete()
    .eq('creator_id', creatorId)
    .eq('level', level)
  if (error) throw error
}

// Posts (RLS enforces gating)
export async function addPost(input: Omit<Post, 'id' | 'created_at'>): Promise<Post> {
  if (!hasClient) throw new Error('Supabase client not configured')
  const { data, error } = await sb
    .from('posts')
    .insert(input)
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data as Post
}

export async function getPostsByCreator(creatorId: string): Promise<Post[]> {
  if (!hasClient) return []
  const { data, error } = await sb
    .from('posts')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Post[]
}

export async function getPostBySlug(creatorId: string, slug: string): Promise<Post | null> {
  if (!hasClient) return null
  const { data, error } = await sb
    .from('posts')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data
}

// Subscriptions
export async function subscribeToCreator(
  creatorId: string,
  tierLevel: number,
  subscriberId: string
): Promise<Subscription> {
  if (!hasClient) throw new Error('Supabase client not configured')
  const { data, error } = await sb
    .from('subscriptions')
    .upsert({
      creator_id: creatorId,
      subscriber_id: subscriberId,
      tier_level: tierLevel,
      subscribed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data as Subscription
}

export async function unsubscribeFromCreator(creatorId: string): Promise<void> {
  if (!hasClient) return
  const { error } = await sb
    .from('subscriptions')
    .delete()
    .eq('creator_id', creatorId)
  if (error) throw error
}

export async function getSubscriptions(): Promise<Subscription[]> {
  if (!hasClient) return []
  const { data, error } = await sb
    .from('subscriptions')
    .select('*')
    .order('subscribed_at', { ascending: false })
  if (error) throw error
  return data as Subscription[]
}

export async function listSubscriptionsByUser(subscriberId: string): Promise<Subscription[]> {
  if (!hasClient) return []
  const { data, error } = await sb
    .from('subscriptions')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .order('subscribed_at', { ascending: false })
  if (error || !data) return []
  return data as Subscription[]
}

export async function listSubscriptionsByCreator(creatorId: string): Promise<Subscription[]> {
  if (!hasClient) return []
  const { data, error } = await sb
    .from('subscriptions')
    .select('*')
    .eq('creator_id', creatorId)
    .order('subscribed_at', { ascending: false })
  if (error) throw error
  return data as Subscription[]
}

export async function getCreatorSubscriberProfiles(creatorId: string): Promise<Profile[]> {
  const subs = await listSubscriptionsByCreator(creatorId)
  const activeSubs = subs.filter(s => new Date(s.expires_at).getTime() > Date.now())
  const ids = activeSubs.map(s => s.subscriber_id)
  return getProfilesByIds(ids)
}

export async function getSubscriptionStatsByTier(creatorId: string): Promise<{ [level: number]: number }> {
  const subs = await listSubscriptionsByCreator(creatorId)
  const activeSubs = subs.filter(s => new Date(s.expires_at).getTime() > Date.now())
  const stats: { [level: number]: number } = {}
  for (const s of activeSubs) {
    stats[s.tier_level] = (stats[s.tier_level] || 0) + 1
  }
  return stats
}

export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (!hasClient || ids.length === 0) return []
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .in('id', ids)
  if (error || !data) return []
  return data as Profile[]
}

// Live Feed
export async function listFeedMessages(creatorId: string): Promise<FeedMessage[]> {
  if (!hasClient) return []
  const { data, error } = await sb
    .from('feed_messages')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as FeedMessage[]
}

export async function postFeedMessage(input: { creator_id: string; author_id: string; body: string; image_url?: string | null }): Promise<FeedMessage> {
  if (!hasClient) throw new Error('Supabase client not configured')
  // Insert only known columns to avoid schema cache errors
  const row = {
    creator_id: input.creator_id,
    author_id: input.author_id,
    body: input.body,
    image_url: input.image_url ?? null,
  } as const
  const { data, error } = await sb
    .from('feed_messages')
    .insert(row)
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data as FeedMessage
}

// Direct Messaging

// Check if user can send message to recipient
export async function canSendMessage(senderId: string, recipientId: string): Promise<boolean> {
  if (!hasClient) return false
  
  const sender = await getProfile(senderId)
  const recipient = await getProfile(recipientId)
  
  if (!sender || !recipient) return false
  
  // Creators can message any of their active subscribers
  if (sender.role === 'creator') {
    const subs = await listSubscriptionsByCreator(senderId)
    const activeSubs = subs.filter(s => new Date(s.expires_at).getTime() > Date.now())
    return activeSubs.some(s => s.subscriber_id === recipientId)
  }
  
  // Fans can only message creators they're subscribed to
  if (sender.role === 'fan' && recipient.role === 'creator') {
    const subs = await listSubscriptionsByUser(senderId)
    const activeSubscription = subs.find(
      sub => sub.creator_id === recipientId && 
             new Date(sub.expires_at).getTime() > Date.now()
    )
    
    if (!activeSubscription) return false
    
    // Check if fan's tier meets creator's minimum messaging tier requirement
    return activeSubscription.tier_level >= recipient.messages_min_tier
  }
  
  return false
}

// Get or create conversation between two users
export async function getOrCreateConversation(userId1: string, userId2: string): Promise<Conversation | null> {
  if (!hasClient) return null
  
  // Check if conversation exists
  const { data: existing, error: selectError } = await sb
    .from('conversations')
    .select('*')
    .or(`and(participant1_id.eq.${userId1},participant2_id.eq.${userId2}),and(participant1_id.eq.${userId2},participant2_id.eq.${userId1})`)
    .maybeSingle()
  
  if (existing) return existing as Conversation
  
  // Create new conversation
  const { data: newConv, error: insertError } = await sb
    .from('conversations')
    .insert({
      participant1_id: userId1,
      participant2_id: userId2,
    })
    .select('*')
    .maybeSingle()
  
  if (insertError) throw insertError
  return newConv as Conversation
}

// Get all conversations for a user with details
export async function getUserConversations(userId: string): Promise<ConversationWithDetails[]> {
  if (!hasClient) return []
  
  // Get all conversations
  const { data: conversations, error: convError } = await sb
    .from('conversations')
    .select('*')
    .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false })
  
  if (convError || !conversations) return []
  
  const result: ConversationWithDetails[] = []
  
  for (const conv of conversations) {
    const otherParticipantId = conv.participant1_id === userId ? conv.participant2_id : conv.participant1_id
    const otherParticipant = await getProfile(otherParticipantId)
    
    if (!otherParticipant) continue
    
    // Get last message
    const { data: lastMsg } = await sb
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    // Get unread count
    const { count } = await sb
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('recipient_id', userId)
      .is('read_at', null)
    
    result.push({
      ...conv,
      other_participant: otherParticipant,
      last_message: lastMsg as DirectMessage | null,
      unread_count: count || 0,
    })
  }
  
  return result
}

// Get messages in a conversation
export async function getConversationMessages(conversationId: string, limit: number = 50): Promise<DirectMessage[]> {
  if (!hasClient) return []
  
  const { data, error } = await sb
    .from('direct_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit)
  
  if (error) throw error
  return data as DirectMessage[]
}

// Send a direct message
export async function sendDirectMessage(
  conversationId: string,
  senderId: string,
  recipientId: string,
  messageText: string
): Promise<DirectMessage> {
  if (!hasClient) throw new Error('Supabase client not configured')
  
  // Validate permission
  const canSend = await canSendMessage(senderId, recipientId)
  if (!canSend) {
    throw new Error('شما مجاز به ارسال پیام به این کاربر نیستید')
  }
  
  const { data, error } = await sb
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      recipient_id: recipientId,
      message_text: messageText,
    })
    .select('*')
    .maybeSingle()
  
  if (error) throw error
  return data as DirectMessage
}

// Mark message as read
export async function markMessageAsRead(messageId: string): Promise<void> {
  if (!hasClient) return
  
  const { error } = await sb
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId)
    .is('read_at', null)
  
  if (error) throw error
}

// Mark all messages in conversation as read
export async function markConversationAsRead(conversationId: string, userId: string): Promise<void> {
  if (!hasClient) return
  
  const { error } = await sb
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('recipient_id', userId)
    .is('read_at', null)
  
  if (error) throw error
}

// Get unread message count for a user
export async function getUnreadMessageCount(userId: string): Promise<number> {
  if (!hasClient) return 0
  
  const { count, error } = await sb
    .from('direct_messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null)
  
  if (error) return 0
  return count || 0
}