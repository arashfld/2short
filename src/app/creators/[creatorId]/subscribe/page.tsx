
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { getProfile, getCreatorTiers, subscribeToCreator, listSubscriptionsByUser } from '@/lib/supabase/service';
import type { Profile, Tier } from '@/lib/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { cn, formatTomans } from '@/lib/utils';
import Image from 'next/image';

export default function SubscribePage() {
  const params = useParams();
  const router = useRouter();
  const creatorId = params.creatorId as string;
  const { toast } = useToast();
  const [creator, setCreator] = useState<Profile | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [currentTier, setCurrentTier] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (creatorId) {
        const creatorData = await getProfile(creatorId);
        if (!creatorData || creatorData.role !== 'creator') {
          setCreator(null);
          setLoading(false);
          return;
        }
        setCreator(creatorData);
        try {
          const creatorTiers = await getCreatorTiers(creatorId);
          setTiers(creatorTiers);
        } catch {
          setTiers([]);
        }
      }
      const { data } = await supabase!.auth.getUser();
      const user = data.user;
      if (user) {
        const subs = await listSubscriptionsByUser(user.id);
        const sub = subs.find(s => s.creator_id === creatorId);
        setCurrentTier(sub?.tier_level ?? 0);
      } else {
        setCurrentTier(0);
      }
      setLoading(false);
    };
    fetchData();
  }, [creatorId]);

  const handleSubscribe = async (level: number) => {
    const { data } = await supabase!.auth.getUser();
    const user = data.user;
    if (!user) {
      toast({ title: 'نیاز به ورود', description: 'برای اشتراک ابتدا وارد شوید.' });
      return;
    }
    setIsSubscribing(level);
    try {
      await subscribeToCreator(creatorId, level, user.id);
      setCurrentTier(level);
      toast({ title: 'اشتراک فعال شد', description: `سطح ${level} برای ${creator?.full_name}` });
    } catch (e: any) {
      toast({ title: 'خطا در اشتراک', description: e?.message ?? 'لطفاً دوباره تلاش کنید.', variant: 'destructive' });
    } finally {
      setIsSubscribing(null);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">در حال بارگذاری ...</div>;
  }

  if (!creator) {
    return (
      <div className="flex h-screen items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">سازنده پیدا نشد</h2>
          <p className="text-muted-foreground">لینک اشتراک نامعتبر است یا سازنده وجود ندارد.</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/explore">
              <Button>بازگشت به لیست سازندگان</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">صفحه اصلی</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30 font-body" dir="rtl">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex items-center gap-3">
              <BrandLogo />
              <span className="text-base font-bold font-headline text-primary relative top-[1px]">
                FarsiFanConnect
              </span>
            </span>
          </Link>
          <Link href={`/creators/${creator.id}`}>
            <Button variant="ghost">بازگشت به پروفایل</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-3xl mx-auto">
          {/* Creator header with avatar and bio */}
          <Card className="mb-8 text-right">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 rounded-full overflow-hidden border">
                    { (creator.avatar_url || creator.profile_image_url) ? (
                      <Image
                        src={(creator.avatar_url || creator.profile_image_url) as string}
                        alt={creator.full_name || 'تصویر سازنده'}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{creator.full_name}</h3>
                    <p className="text-xs text-muted-foreground">اشتراک در این سازنده</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            {creator.bio && (
              <CardContent>
                <p className="text-sm text-muted-foreground leading-6">
                  {creator.bio}
                </p>
              </CardContent>
            )}
          </Card>
          <div className="text-right mb-8">
            <h2 className="text-2xl font-bold">اشتراک در {creator.full_name}</h2>
            <p className="text-muted-foreground mt-2">در این نسخه پرداخت لازم نیست — با یک کلیک مشترک می‌شوید.</p>
            {currentTier > 0 && (
              <p className="mt-2">
                وضعیت فعلی: مشترک سطح {currentTier}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {tiers.length > 0 ? (
              tiers.map((tier) => (
                <Card key={tier.id} className={cn('text-right', currentTier === tier.level && 'border-primary')}>
                  <CardHeader>
                    <CardTitle className="flex items-baseline justify-between">
                      <span>{tier.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {tier.price_cents ? `${formatTomans(tier.price_cents)} تومان` : 'رایگان'}
                      </span>
                    </CardTitle>
                    {tier.description && (
                      <CardDescription>{tier.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">سطح {tier.level}</p>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button
                      onClick={() => handleSubscribe(tier.level)}
                      disabled={isSubscribing === tier.level || currentTier === tier.level}
                    >
                      {currentTier === tier.level ? 'مشترک شده' : isSubscribing === tier.level ? 'در حال اشتراک...' : 'اشتراک در این سطح'}
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card className="text-right">
                <CardHeader>
                  <CardTitle>سطحی تعریف نشده است</CardTitle>
                  <CardDescription>این سازنده هنوز سطوح اشتراک خود را تنظیم نکرده است.</CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-end">
                  <Link href={`/creators/${creator.id}`}>
                    <Button variant="ghost">بازگشت به پروفایل</Button>
                  </Link>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
