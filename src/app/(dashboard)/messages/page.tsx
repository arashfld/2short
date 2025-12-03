'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ConversationList } from '@/components/messages/conversation-list';
import { MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FanMessagesPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase!.auth.getUser();
      setUserId(data.user?.id || null);
    };
    loadUser();
  }, []);

  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">پیام‌ها</h1>
        <p className="text-muted-foreground">گفتگوهای شما با سازندگان</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                گفتگوها
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConversationList userId={userId} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4" />
                <p>یک گفتگو را انتخاب کنید تا پیام‌ها نمایش داده شوند</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
