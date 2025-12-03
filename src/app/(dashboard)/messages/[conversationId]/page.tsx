'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ConversationThread } from '@/components/messages/conversation-thread';
import { ConversationList } from '@/components/messages/conversation-list';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FanConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const [userId, setUserId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase!.auth.getUser();
        const currentUserId = data.user?.id;
        if (!currentUserId) return;
        
        setUserId(currentUserId);

        // Get conversation to find other participant
        const { data: convData } = await supabase!
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .maybeSingle();

        if (convData) {
          const otherId = convData.participant1_id === currentUserId 
            ? convData.participant2_id 
            : convData.participant1_id;
          setOtherUserId(otherId);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      }
      setLoading(false);
    };

    loadData();
  }, [conversationId]);

  if (loading || !userId || !otherUserId) {
    return (
      <div className="flex h-screen items-center justify-center">
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8" dir="rtl">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => router.push('/dashboard/messages')}>
          <ArrowLeft className="h-4 w-4 ml-2" />
          بازگشت به لیست گفتگوها
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 hidden lg:block">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                گفتگوها
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConversationList userId={userId} selectedConversationId={conversationId} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-[calc(100vh-12rem)]">
            <ConversationThread 
              conversationId={conversationId} 
              currentUserId={userId} 
              otherUserId={otherUserId} 
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
