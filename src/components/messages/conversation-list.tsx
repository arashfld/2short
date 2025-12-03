'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserConversations } from '@/lib/supabase/service';
import type { ConversationWithDetails } from '@/lib/supabase/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ConversationListProps {
  userId: string;
  selectedConversationId?: string;
}

export function ConversationList({ userId, selectedConversationId }: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      try {
        const data = await getUserConversations(userId);
        setConversations(data);
      } catch (error) {
        console.error('Error loading conversations:', error);
        setConversations([]);
      }
      setLoading(false);
    };

    loadConversations();
    
    // Refresh conversations every 10 seconds
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">هنوز پیامی ندارید</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => {
        const isSelected = conv.id === selectedConversationId;
        const lastMessagePreview = conv.last_message 
          ? conv.last_message.message_text.substring(0, 50) + (conv.last_message.message_text.length > 50 ? '...' : '')
          : 'شروع گفتگو';
        
        const timeAgo = conv.last_message 
          ? formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: true, locale: ar })
          : '';

        return (
          <Card
            key={conv.id}
            className={`cursor-pointer transition-colors hover:bg-accent ${
              isSelected ? 'bg-accent border-primary' : ''
            }`}
            onClick={() => router.push(`/dashboard/messages/${conv.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={conv.other_participant.profile_image_url || conv.other_participant.avatar_url || undefined} 
                    alt={conv.other_participant.full_name || 'User'} 
                  />
                  <AvatarFallback>
                    {(conv.other_participant.full_name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">
                      {conv.other_participant.full_name || conv.other_participant.email || 'کاربر'}
                    </h3>
                    {conv.unread_count > 0 && (
                      <Badge variant="default" className="rounded-full px-2 py-0.5 text-xs">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {lastMessagePreview}
                    </p>
                    {timeAgo && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
