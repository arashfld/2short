
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getProfile, updateProfile, getCreatorTiers, upsertTier, deleteTier } from '@/lib/supabase/service';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { ImageUploader } from '@/components/image-uploader';
import { cn } from '@/lib/utils';

const settingsSchema = z.object({
  fullName: z.string().min(2, "نام کامل باید حداقل ۲ حرف داشته باشد."),
  bio: z.string().max(200, "بیوگرافی نمی‌تواند بیشتر از ۲۰۰ حرف باشد.").optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function CreatorSettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null);
  const [tiersState, setTiersState] = useState<Record<number, { enabled: boolean; name: string; description: string; priceTomans: string }>>({
    1: { enabled: false, name: '', description: '', priceTomans: '' },
    2: { enabled: false, name: '', description: '', priceTomans: '' },
    3: { enabled: false, name: '', description: '', priceTomans: '' },
  });
  const [feedMinTier, setFeedMinTier] = useState<number>(0);
  const [messagesMinTier, setMessagesMinTier] = useState<number>(0);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      fullName: '',
      bio: '',
    }
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      setUserId(user.id);
      setIsLoading(true);
      try {
        const profile = await getProfile(user.id);
        if (mounted && profile) {
          form.reset({
            fullName: profile.full_name || '',
            bio: profile.bio || '',
          });
          setProfileImageUrl(profile.profile_image_url || profile.avatar_url || null);
          setBannerImageUrl(profile.banner_image_url || null);
          setFeedMinTier(typeof profile.feed_min_tier === 'number' ? profile.feed_min_tier : 0);
          setMessagesMinTier(typeof profile.messages_min_tier === 'number' ? profile.messages_min_tier : 0);
        }
        // Load creator tiers
        try {
          const tiers = await getCreatorTiers(user.id);
          const nextState: Record<number, { enabled: boolean; name: string; description: string; priceTomans: string }> = {
            1: { enabled: false, name: '', description: '', priceTomans: '' },
            2: { enabled: false, name: '', description: '', priceTomans: '' },
            3: { enabled: false, name: '', description: '', priceTomans: '' },
          };
          tiers.forEach(t => {
            if (t.level >= 1 && t.level <= 3) {
              nextState[t.level] = {
                enabled: true,
                name: t.name ?? '',
                description: t.description ?? '',
                priceTomans: t.price_cents != null ? String(t.price_cents) : '',
              };
            }
          });
          if (mounted) setTiersState(nextState);
        } catch {
          // Ignore tiers load errors; keep defaults
        }
      } finally {
        setIsLoading(false);
      }
    })();
    return () => { mounted = false };
  }, [form]);

  // Supabase settings currently support text fields (full name, bio).


  const onSubmit = async (data: SettingsFormValues) => {
    setIsLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        toast({ title: 'خطا', description: 'برای ذخیره تنظیمات باید وارد شوید.', variant: 'destructive' });
        return;
      await updateProfile(user.id, { full_name: data.fullName, bio: data.bio, feed_min_tier: feedMinTier, messages_min_tier: messagesMinTier });
      toast({ title: 'تنظیمات ذخیره شد', description: 'پروفایل شما به‌روزرسانی شد.' });tier: feedMinTier });
      toast({ title: 'تنظیمات ذخیره شد', description: 'پروفایل شما به‌روزرسانی شد.' });
    } catch (error) {
      toast({ title: 'خطا در ذخیره', description: 'ذخیره تنظیمات با مشکل مواجه شد. دوباره تلاش کنید.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTierChange = (level: 1 | 2 | 3, field: 'name' | 'description' | 'priceTomans', value: string) => {
    setTiersState(prev => ({
      ...prev,
      [level]: { ...prev[level], [field]: value }
    }));
  };

  const handleTierToggle = (level: 1 | 2 | 3, enabled: boolean) => {
    setTiersState(prev => ({
      ...prev,
      [level]: { ...prev[level], enabled }
    }));
  };

  const saveTiers = async () => {
    if (!userId) {
      toast({ title: 'ابتدا وارد شوید', description: 'برای مدیریت سطوح باید وارد شوید.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      for (const level of [1, 2, 3] as const) {
        const row = tiersState[level];
        const nameTrim = row.name.trim();
        const descTrim = row.description.trim();
        const priceVal = row.priceTomans.trim();
        const priceTomans = priceVal === '' ? null : Number.parseInt(priceVal, 10);

        if (!row.enabled) {
          // If disabled, delete any existing tier row
          await deleteTier(userId, level);
          continue;
        }

        // Validation: price in tomans
        if (priceTomans != null) {
          if (priceTomans < 50000) {
            toast({ title: `حداقل قیمت سطح ${level}`, description: 'حداقل قیمت ۵۰,۰۰۰ تومان است.', variant: 'destructive' });
            setIsLoading(false);
            return;
          }
          if (level === 3 && priceTomans > 2500000) {
            toast({ title: 'حداکثر قیمت سطح ۳', description: 'حداکثر قیمت برای سطح ۳ برابر ۲,۵۰۰,۰۰۰ تومان است.', variant: 'destructive' });
            setIsLoading(false);
            return;
          }
        }

        if (!nameTrim) {
          toast({ title: `نام سطح ${level} الزامی است`, description: 'برای فعال‌سازی سطح، نام را وارد کنید.', variant: 'destructive' });
          setIsLoading(false);
          return;
        }

        await upsertTier({
          creator_id: userId,
          level,
          name: nameTrim,
          description: descTrim || null,
          price_cents: Number.isFinite(priceTomans!) ? priceTomans : null,
        });
      }
      toast({ title: 'سطوح اشتراک ذخیره شد', description: 'تغییرات سطوح با موفقیت اعمال شد.' });
      // Refresh tiers from server to update exists flags accurately
      const refreshed = await getCreatorTiers(userId);
      const nextState: Record<number, { enabled: boolean; name: string; description: string; priceTomans: string }> = {
        1: { enabled: false, name: '', description: '', priceTomans: '' },
        2: { enabled: false, name: '', description: '', priceTomans: '' },
        3: { enabled: false, name: '', description: '', priceTomans: '' },
      };
      refreshed.forEach(t => {
        if (t.level >= 1 && t.level <= 3) {
          nextState[t.level] = {
            enabled: true,
            name: t.name ?? '',
            description: t.description ?? '',
            priceTomans: t.price_cents != null ? String(t.price_cents) : '',
          };
        }
      });
      setTiersState(nextState);
    } catch (error) {
      toast({ title: 'خطا در ذخیره سطوح', description: 'لطفاً دوباره تلاش کنید.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl" dir="rtl">
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline text-right">تنظیمات تولیدکننده</h1>
                <p className="text-muted-foreground mt-2 text-right">
                    تنظیمات حساب و محتوای خود را مدیریت کنید.
                </p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>پروفایل عمومی</CardTitle>
                            <CardDescription>
                                این اطلاعات در صفحه عمومی شما نمایش داده می‌شود.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="fullName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>نام کامل</FormLabel>
                                        <FormControl>
                                            <Input placeholder="نام نمایشی شما" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="bio"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>بیوگرافی</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="کمی درباره خودتان بگویید..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {userId && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ImageUploader
                                  userId={userId}
                                  kind="profile"
                                  label="تصویر پروفایل"
                                  initialUrl={profileImageUrl}
                                  onUploaded={(url) => setProfileImageUrl(url)}
                                />
                                <ImageUploader
                                  userId={userId}
                                  kind="banner"
                                  label="تصویر بنر"
                                  initialUrl={bannerImageUrl}
                                  onUploaded={(url) => setBannerImageUrl(url)}
                                />
                              </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>حداقل سطح دسترسی فید</CardTitle>
                        <CardDescription>
                          تعیین کنید فید عمومی شما برای چه سطحی قابل مشاهده باشد.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                          <div>
                            <FormLabel>حداقل سطح</FormLabel>
                            <select
                              className="w-full h-9 rounded-md border px-3 text-sm bg-background"
                              value={feedMinTier}
                              onChange={(e) => setFeedMinTier(Number(e.target.value))}
                            >
                              <option value={0}>عمومی (سطح ۰)</option>
                              <option value={1}>سطح ۱</option>
                              <option value={2}>سطح ۲</option>
                              <option value={3}>سطح ۳</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm text-muted-foreground mt-2">
                              دسترسی به پیام‌های فید توسط قوانین پایگاه‌داده کنترل می‌شود.
                              اگر ستون مربوطه در پایگاه‌داده فعال باشد، این تنظیم اعمال خواهد شد.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>حداقل سطح برای ارسال پیام مستقیم</CardTitle>
                        <CardDescription>
                          تعیین کنید کدام سطح از مشترکین می‌توانند برای شما پیام مستقیم ارسال کنند.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                          <div>
                            <FormLabel>حداقل سطح</FormLabel>
                            <select
                              className="w-full h-9 rounded-md border px-3 text-sm bg-background"
                              value={messagesMinTier}
                              onChange={(e) => setMessagesMinTier(Number(e.target.value))}
                            >
                              <option value={0}>همه مشترکین</option>
                              <option value={1}>سطح ۱ به بالا</option>
                              <option value={2}>سطح ۲ به بالا</option>
                              <option value={3}>فقط سطح ۳</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm text-muted-foreground mt-2">
                              فقط مشترکین فعال با سطح برابر یا بالاتر از این مقدار می‌توانند برای شما پیام بفرستند.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>مدیریت سطوح اشتراک</CardTitle>
                        <CardDescription>
                          نام، توضیحات و قیمت هر سطح (به تومان) را تعیین کنید. برای غیرفعال کردن یک سطح، سوئیچ آن را خاموش کنید.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {[1, 2, 3].map((lvl) => (
                          <div key={lvl} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <FormLabel className="font-semibold">{`سطح ${lvl}`}</FormLabel>
                              <div className="flex items-center gap-2">
                                <FormLabel>فعال</FormLabel>
                                <Switch
                                  checked={tiersState[lvl as 1 | 2 | 3]?.enabled || false}
                                  onCheckedChange={(checked) => handleTierToggle(lvl as 1 | 2 | 3, checked)}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                              <div>
                              <FormLabel>نام سطح</FormLabel>
                              <Input
                                placeholder={`مثلاً: طلایی، نقره‌ای ...`}
                                value={tiersState[lvl as 1 | 2 | 3]?.name || ''}
                                onChange={(e) => handleTierChange(lvl as 1 | 2 | 3, 'name', e.target.value)}
                              />
                            </div>
                            <div>
                              <FormLabel>قیمت (تومان)</FormLabel>
                              <Input
                                inputMode="numeric"
                                pattern="[0-9]*"
                                dir="ltr"
                                placeholder="حداقل ۵۰,۰۰۰"
                                value={tiersState[lvl as 1 | 2 | 3]?.priceTomans || ''}
                                onChange={(e) => handleTierChange(lvl as 1 | 2 | 3, 'priceTomans', e.target.value)}
                              />
                              {(tiersState[lvl as 1 | 2 | 3]?.enabled && (tiersState[lvl as 1 | 2 | 3]?.priceTomans || '').trim() !== '') && (() => {
                                const val = Number.parseInt((tiersState[lvl as 1 | 2 | 3]?.priceTomans || '').trim(), 10);
                                const tooLow = Number.isFinite(val) && val < 50000;
                                const tooHigh = Number.isFinite(val) && lvl === 3 && val > 2500000;
                                return (
                                  <p className={cn('mt-2 text-xs', tooLow || tooHigh ? 'text-destructive' : 'text-muted-foreground')}>
                                    {tooLow && 'حداقل قیمت ۵۰,۰۰۰ تومان است.'}
                                    {!tooLow && tooHigh && 'حداکثر قیمت سطح ۳ برابر ۲,۵۰۰,۰۰۰ تومان است.'}
                                    {!tooLow && !tooHigh && 'قیمت ماهانه به تومان.'}
                                  </p>
                                );
                              })()}
                            </div>
                            <div>
                              <FormLabel>توضیحات</FormLabel>
                              <Textarea
                                placeholder="مزایا و توضیحات این سطح را وارد کنید"
                                value={tiersState[lvl as 1 | 2 | 3]?.description || ''}
                                onChange={(e) => handleTierChange(lvl as 1 | 2 | 3, 'description', e.target.value)}
                              />
                            </div>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-start">
                          <Button type="button" onClick={saveTiers} isLoading={isLoading}>
                            ذخیره سطوح اشتراک
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-start">
                        <Button type="submit" isLoading={isLoading || form.formState.isSubmitting}>
                            ذخیره تغییرات
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    </div>
  );
}
