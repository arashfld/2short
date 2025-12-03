'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Users, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCreatorSubscriberProfiles, getSubscriptionStatsByTier, getOrCreateConversation } from "@/lib/supabase/service";
import type { Profile } from "@/lib/supabase/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function AnalyticsPage() {
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<Profile[]>([]);
  const [stats, setStats] = useState<{ [level: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase!.auth.getUser();
        const user = data.user;
        if (!user) return;
        
        setCreatorId(user.id);
        const [subscribersList, tierStats] = await Promise.all([
          getCreatorSubscriberProfiles(user.id),
          getSubscriptionStatsByTier(user.id),
        ]);
        
        setSubscribers(subscribersList);
        setStats(tierStats);
      } catch (error) {
        console.error('Error loading analytics:', error);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  const handleSendMessage = async (subscriberId: string) => {
    if (!creatorId) return;
    
    try {
      const conversation = await getOrCreateConversation(creatorId, subscriberId);
      if (conversation) {
        router.push(`/dashboard/creator/messages/${conversation.id}`);
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ایجاد گفتگو',
        variant: 'destructive',
      });
    }
  };

  const filteredSubscribers = subscribers.filter(sub => 
    sub.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSubscribers = Object.values(stats).reduce((sum, count) => sum + count, 0);

  const getTierBadge = (level: number) => {
    const tierColors = {
      1: 'bg-blue-500',
      2: 'bg-purple-500',
      3: 'bg-amber-500',
    };
    const stars = '⭐'.repeat(level);
    return (
      <Badge className={`${tierColors[level as keyof typeof tierColors]} text-white`}>
        سطح {level} {stars}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8" dir="rtl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">تجزیه و تحلیل</h1>
          <p className="text-muted-foreground">آمار و اطلاعات مشترکین شما</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                کل مشترکین
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : totalSubscribers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                سطح 1 ⭐
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : stats[1] || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                سطح 2 ⭐⭐
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : stats[2] || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                سطح 3 ⭐⭐⭐
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : stats[3] || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Subscribers List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle>مشترکین فعال</CardTitle>
              </div>
              <Input
                type="text"
                placeholder="جستجوی نام یا ایمیل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'مشترکی با این نام یافت نشد' : 'هنوز مشترکی ندارید'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSubscribers.map((subscriber) => {
                  // Find subscriber's tier from subscriptions
                  const tierLevel = Object.entries(stats).find(() => true)?.[0] || 1; // This is simplified - in real app, get from subscription
                  
                  return (
                    <div key={subscriber.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors">
                      <Avatar className="h-12 w-12">
                        <AvatarImage 
                          src={subscriber.profile_image_url || subscriber.avatar_url || undefined} 
                          alt={subscriber.full_name || 'User'} 
                        />
                        <AvatarFallback>
                          {(subscriber.full_name || subscriber.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold">{subscriber.full_name || 'بدون نام'}</h3>
                        <p className="text-sm text-muted-foreground">{subscriber.email}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendMessage(subscriber.id)}
                        >
                          <MessageCircle className="h-4 w-4 ml-2" />
                          ارسال پیام
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
