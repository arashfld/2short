
'use client';
import { getProfile, listSubscriptionsByUser } from "@/lib/supabase/service";
import { supabase } from "@/lib/supabase";
import type { Post as SbPost, Profile, Subscription } from "@/lib/supabase/types";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function PostPage() { 
  const params = useParams();
  const { creatorId, postSlug } = params as { creatorId: string, postSlug: string };
  const [post, setPost] = useState<SbPost | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserTier, setCurrentUserTier] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const creatorData = await getProfile(creatorId);
      if (creatorData) setCreator(creatorData);
      let fetchedPost: SbPost | null = null;
      try {
        const res = await fetch(`/api/supabase/creators/${creatorId}/posts/${postSlug}`);
        const json = await res.json();
        fetchedPost = json?.post ?? null;
      } catch {
        fetchedPost = null;
      }
      setPost(fetchedPost);
      try {
        if (supabase) {
          const { data } = await supabase.auth.getUser();
          const user = data.user;
          if (user) {
            const subs: Subscription[] = await listSubscriptionsByUser(user.id);
            const active = subs.find(s => s.creator_id === creatorId && new Date(s.expires_at).getTime() > Date.now());
            setCurrentUserTier(active ? active.tier_level : 0);
          } else {
            setCurrentUserTier(0);
          }
        } else {
          setCurrentUserTier(0);
        }
      } catch {
        setCurrentUserTier(0);
      }
      setLoading(false);
    };
    fetchData();
  }, [creatorId, postSlug]);

  if (loading) {
      return <div className="flex h-screen items-center justify-center">در حال بارگذاری پست...</div>
  }
  
  if (!creator) {
    return (
      <div className="flex h-screen items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-semibold">پروفایل سازنده پیدا نشد</h2>
          <p className="text-muted-foreground mt-2">لطفاً شناسه سازنده را بررسی کنید.</p>
        </div>
      </div>
    );
  }
  
  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-secondary/30" dir="rtl">
        <div className="bg-background p-8 rounded-lg shadow-xl max-w-md w-full">
          <h1 className="text-2xl font-bold font-headline">پست پیدا نشد</h1>
          <p className="text-muted-foreground mt-2 mb-6">این پست وجود ندارد یا حذف شده است.</p>
          <Link href={`/creators/${creatorId}`} className="text-sm text-muted-foreground hover:text-primary block">
            بازگشت به پروفایل {creator.full_name}
          </Link>
        </div>
      </div>
    );
  }

  const isLocked = post.required_tier_level > currentUserTier;

  if (isLocked) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-secondary/30" dir="rtl">
            <div className="bg-background p-8 rounded-lg shadow-xl max-w-md w-full">
                <div className="flex justify-center mb-4">
                    <Lock className="w-12 h-12 text-primary"/>
                </div>
                <h1 className="text-3xl font-bold font-headline">محتوای سطح‌بندی‌شده</h1>
                <p className="text-muted-foreground mt-2 mb-6">
                    برای مشاهده این پست مشترک شوید.
                </p>
                <div className="mb-6">
                  <Link
                    href={`/creators/${creatorId}/subscribe`}
                    className={buttonVariants({ variant: "default", size: "default" })}
                  >
                    مشترک شوید
                  </Link>
                </div>
                <Link href={`/creators/${creatorId}`} className="text-sm text-muted-foreground hover:text-primary block">
                    بازگشت به پروفایل {creator.full_name}
                </Link>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30 font-body">
         <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" dir="rtl">
            <div className="container flex h-14 items-center">
                <Link href="/" className="flex items-center gap-3">
                    <span className="flex items-center gap-3">
                        <BrandLogo />
                  <span className="text-base font-bold font-headline text-primary relative top-[1px]">
                    FarsiFanConnect
                  </span>
                    </span>
                </Link>
            </div>
        </header>

        <main className="flex-1 py-12 md:py-16">
            <article className="container max-w-3xl mx-auto bg-background p-8 rounded-lg shadow-lg">
                <div className="mb-8">
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                        {post.image_url ? (
                          /^https?:\/\//.test(post.image_url) ? (
                            <img
                              src={post.image_url}
                              alt={post.title}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <Image src={post.image_url} alt={post.title} fill className="object-cover" unoptimized />
                          )
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-muted/30 via-muted to-muted-foreground/20" aria-hidden="true" />
                        )}
                    </div>
                </div>

                {(() => {
                  let safeTitle = typeof post.title === 'string' ? post.title : ''
                  if (safeTitle === 'Object' || /^\[object .*\]$/.test(safeTitle)) safeTitle = ''
                  return (
                    <h1 className="text-3xl md:text-4xl font-bold font-headline mb-4 text-right">{safeTitle || 'بدون عنوان'}</h1>
                  )
                })()}

                <div className="flex items-center gap-4 mb-8">
                    {(() => {
                      let safeName = typeof creator.full_name === 'string' ? creator.full_name : ''
                      if (safeName === 'Object' || /^\[object .*\]$/.test(safeName)) safeName = ''
                      return (
                        <Avatar>
                          <AvatarImage src={creator.avatar_url || ''} alt={safeName} />
                          <AvatarFallback>{(safeName || '').charAt(0)}</AvatarFallback>
                        </Avatar>
                      )
                    })()}
                    <div>
                        {(() => {
                          let safeName2 = typeof creator.full_name === 'string' ? creator.full_name : ''
                          if (safeName2 === 'Object' || /^\[object .*\]$/.test(safeName2)) safeName2 = ''
                          return <p className="font-semibold">{safeName2 || '—'}</p>
                        })()}
                        <p className="text-sm text-muted-foreground">{post.required_tier_level === 0 ? 'پست عمومی' : `سطح ${post.required_tier_level} و بالاتر`}</p>
                    </div>
                </div>

                <div className="prose prose-lg max-w-none text-right text-foreground leading-relaxed" dir="rtl">
                   {(() => {
                     let raw = typeof post.content === 'string' ? post.content : post.content ? JSON.stringify(post.content) : ''
                     if (raw === 'Object' || raw === '[object Object]') raw = ''
                     return <p>{raw}</p>
                   })()}
                </div>
            </article>
        </main>
        
        <footer className="w-full py-6 text-center z-10 relative" dir="rtl">
            <div className="container mx-auto">
            <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} FarsiFanConnect. تمام حقوق محفوظ است.
            </p>
            </div>
      </footer>
    </div>
  );
}
