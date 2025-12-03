
'use client';

import type { Profile, Post as SbPost, Subscription } from "@/lib/supabase/types";
import { listSubscriptionsByUser, getOrCreateConversation, canSendMessage } from "@/lib/supabase/service";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { PostCard } from "@/components/post-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Eye, MessageCircle } from "lucide-react";

export default function CreatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const creatorId = params.creatorId as string;
  const { toast } = useToast();
  const [creator, setCreator] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<SbPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentUserTier, setCurrentUserTier] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canMessage, setCanMessage] = useState(false);
  const [checkingMessage, setCheckingMessage] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!creatorId) return;
      setLoading(true);
      let profile: Profile | null = null;
      try {
        const resProfile = await fetch(`/api/supabase/creators/${creatorId}/profile`);
        if (resProfile.ok) {
          const json = await resProfile.json();
          profile = json?.profile ?? null;
        }
      } catch {}
      if (profile) setCreator(profile);
      setPostsLoading(true);
      try {
        const res = await fetch(`/api/supabase/creators/${creatorId}/posts`);
        if (!res.ok) throw new Error('failed to fetch posts');
        const json = await res.json();
        setPosts(Array.isArray(json?.posts) ? json.posts : []);
      } catch {
        setPosts([]);
      }
      setPostsLoading(false);
      // Determine subscriber tier for this creator (0 = public)
      try {
        if (supabase) {
          const { data } = await supabase.auth.getUser();
          const user = data.user;
          if (user) {
            setCurrentUserId(user.id);
            const subs: Subscription[] = await listSubscriptionsByUser(user.id);
            const active = subs.find(s => s.creator_id === creatorId && new Date(s.expires_at).getTime() > Date.now());
            setCurrentUserTier(active ? active.tier_level : 0);
            
            // Check if user can send message to this creator
            setCheckingMessage(true);
            const canMsg = await canSendMessage(user.id, creatorId);
            setCanMessage(canMsg);
            setCheckingMessage(false);
          } else {
            setCurrentUserTier(0);
            setCurrentUserId(null);
            setCanMessage(false);
          }
        } else {
          setCurrentUserTier(0);
          setCurrentUserId(null);
          setCanMessage(false);
        }
      } catch {
        setCurrentUserTier(0);
        setCurrentUserId(null);
        setCanMessage(false);
      }
      setLoading(false);
    };
    run();
  }, [creatorId]);

  // Subscriptions are disabled in MVP; skip subscription checks

  const handleSendMessage = async () => {
    if (!currentUserId) {
      toast({
        title: 'لطفاً وارد شوید',
        description: 'برای ارسال پیام باید وارد حساب کاربری خود شوید',
        variant: 'destructive',
      });
      return;
    }

    try {
      const conversation = await getOrCreateConversation(currentUserId, creatorId);
      if (conversation) {
        router.push(`/dashboard/messages/${conversation.id}`);
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ایجاد گفتگو',
        variant: 'destructive',
      });
    }
  };

  // Subscriptions are disabled; no handler

  if (loading) {
    return <div className="flex items-center justify-center h-screen">در حال بارگذاری پروفایل...</div>;
  }

  if (!creator) {
    return (
      <div className="flex items-center justify-center h-screen" dir="rtl">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">پروفایل سازنده پیدا نشد</h2>
          <p className="text-muted-foreground">شناسه سازنده نامعتبر است یا پروفایل وجود ندارد.</p>
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

  const isOwnProfile = false; // Not needed for Supabase public view

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <header className="absolute top-0 left-0 w-full z-30 p-4 sm:p-6 flex justify-between items-center" dir="rtl">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex items-center gap-3">
            <BrandLogo />
            <span className="text-base font-bold font-headline text-primary-foreground relative top-[1px]">
              FarsiFanConnect
            </span>
          </span>
        </Link>
      </header>

      <main className="flex-1">
        {/* Creator Header */}
        <section className="relative h-64 md:h-80 w-full">
            {creator.banner_image_url ? (
              <Image
                src={creator.banner_image_url}
                alt="banner"
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 bg-muted" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </section>
              <div className="mt-6 md:mt-0 md:mr-auto flex items-center gap-2">
                {canMessage && !checkingMessage && (
                  <Button variant="outline" onClick={handleSendMessage}>
                    <MessageCircle className="h-4 w-4 ml-2" />
                    ارسال پیام
                  </Button>
                )}
                <Link href={`/creators/${creatorId}/subscribe`}>
                  <Button>مشترک شوید</Button>
                </Link>
              </div>lassName="relative h-32 w-32 md:h-48 md:w-48 rounded-full border-4 border-background shadow-lg overflow-hidden">
                {(creator.profile_image_url || creator.avatar_url) ? (
                  <Image
                    src={creator.profile_image_url || creator.avatar_url!}
                    alt={creator.full_name || ''}
                    fill
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-muted/30 via-muted to-muted-foreground/20" aria-hidden="true" />
                )}
              </div>
              <div className="mt-4 md:mt-0 md:mr-6 text-center md:text-right">
                <h1 className="text-3xl md:text-5xl font-bold font-headline">
                  {creator.full_name}
                </h1>
                <p className="text-muted-foreground mt-2 max-w-lg">
                  {creator.bio}
                </p>
              </div>
              <div className="mt-6 md:mt-0 md:mr-auto flex items-center gap-2">
                <Link href={`/creators/${creatorId}/subscribe`}>
                  <Button>مشترک شوید</Button>
                </Link>
              </div>
            </div>

            {/* Tabs: Feed / Posts */}
            <div className="mt-10 flex justify-end" dir="rtl">
              <div className="inline-flex rounded-md border bg-background p-1">
                <Link href={`/creators/${creatorId}/feed`}>
                  <Button variant="ghost" size="sm" className="px-3">فید</Button>
                </Link>
                <Link href={`/creators/${creatorId}`}>
                  <Button size="sm" className="px-3">پست‌ها</Button>
                </Link>
              </div>
            </div>

            {/* Posts Grid */}
            <div className="mt-6" dir="rtl">
              <h2 className="text-2xl font-bold font-headline mb-8 text-right">
                پست‌های سازنده
              </h2>
              {postsLoading ? (
                 <div className="text-center py-16"><p>در حال بارگذاری پست ها...</p></div>
              ) : posts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {posts.map((post) => (
                    <Link href={`/creators/${post.creator_id}/posts/${post.slug}`} key={post.id} className="h-full">
                        <PostCard post={post} currentUserTier={currentUserTier} imageUrl={post.image_url ?? undefined} imageHint="post image" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                  <h3 className="text-xl font-semibold">پستی برای نمایش یافت نشد.</h3>
                  <p className="text-muted-foreground mt-2">اگر مشترک هستید، کمی بعد دوباره امتحان کنید.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full py-6 text-center bg-background z-10 relative" dir="rtl">
        <div className="container mx-auto">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FarsiFanConnect. تمام حقوق محفوظ است.
          </p>
        </div>
      </footer>
    </div>
  );
}
