'use client';

import { useEffect, useState, useRef } from 'react';
import { getConversationMessages, markConversationAsRead, sendDirectMessage, getProfile } from '@/lib/supabase/service';
import type { DirectMessage, Profile } from '@/lib/supabase/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ConversationThreadProps {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
}

export function ConversationThread({ conversationId, currentUserId, otherUserId }: ConversationThreadProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [messagesData, userData] = await Promise.all([
          getConversationMessages(conversationId),
          getProfile(otherUserId),
        ]);
        setMessages(messagesData);
        setOtherUser(userData);
        
        // Mark messages as read
        await markConversationAsRead(conversationId, currentUserId);
      } catch (error) {
        console.error('Error loading conversation:', error);
      }
      setLoading(false);
    };

    loadData();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(async () => {
      try {
        const messagesData = await getConversationMessages(conversationId);
        setMessages(messagesData);
        await markConversationAsRead(conversationId, currentUserId);
      } catch (error) {
        console.error('Error refreshing messages:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [conversationId, currentUserId, otherUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;

    setSending(true);
    try {
      const newMessage = await sendDirectMessage(conversationId, currentUserId, otherUserId, messageText.trim());
      setMessages([...messages, newMessage]);
      setMessageText('');
      scrollToBottom();
    } catch (error: any) {
      toast({
        title: 'خطا در ارسال پیام',
        description: error?.message || 'لطفاً دوباره تلاش کنید',
        variant: 'destructive',
      });
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <Skeleton className="h-16 w-64 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 bg-background">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={otherUser?.profile_image_url || otherUser?.avatar_url || undefined} 
              alt={otherUser?.full_name || 'User'} 
            />
            <AvatarFallback>
              {(otherUser?.full_name || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{otherUser?.full_name || otherUser?.email || 'کاربر'}</h2>
            {otherUser?.role === 'creator' && (
              <p className="text-xs text-muted-foreground">سازنده محتوا</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            پیامی وجود ندارد. اولین پیام را ارسال کنید!
          </div>
        ) : (
          messages.map((message) => {
            const isSentByMe = message.sender_id === currentUserId;
            const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ar });

            return (
              <div
                key={message.id}
                className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isSentByMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <Card className={isSentByMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                    <CardContent className="p-3">
                      <p className="text-sm whitespace-pre-wrap break-words">{message.message_text}</p>
                    </CardContent>
                  </Card>
                  <span className="text-xs text-muted-foreground px-1">{timeAgo}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4 bg-background">
        <div className="flex gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="پیام خود را بنویسید... (Enter برای ارسال، Shift+Enter برای خط جدید)"
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={sending}
            dir="rtl"
          />
          <Button 
            onClick={handleSend} 
            disabled={!messageText.trim() || sending}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          حداکثر 5000 کاراکتر
        </p>
      </div>
    </div>
  );
}
