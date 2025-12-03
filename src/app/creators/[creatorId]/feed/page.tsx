
'use client';

import { getProfile, listFeedMessages } from "@/lib/supabase/service";
import type { Profile, FeedMessage } from "@/lib/supabase/types";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
// Image removed for feed content rendering; using <img> for broader domain support
import { FeedComposer } from "@/components/feed-composer";

export default function CreatorFeedPage() { 
  const params = useParams();
  const router = useRouter();
  const creatorId = params.creatorId as string;
  const [creator, setCreator] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isCreatorUser, setIsCreatorUser] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const creatorData = await getProfile(creatorId);
        setCreator(creatorData);
      } catch (e) {
        // Gracefully handle profile fetch errors (e.g., RLS, network)
        setCreator(null);
      } finally {
        setLoading(false);
      }
    };
    const fetchMessages = async () => {
      setMessagesLoading(true);
      try {
        const data = await listFeedMessages(creatorId);
        setMessages(data);
      } catch (e) {
        setMessages([]);
      }
      setMessagesLoading(false);
    };
    const fetchAuth = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setIsCreatorUser(!!user && user.id === creatorId);
    };
    if (creatorId) {
      fetchData();
      fetchMessages();
      fetchAuth();
    }
  }, [creatorId]);

  if (loading || messagesLoading) {
    return <div className="flex h-screen items-center justify-center">در حال بارگذاری فید...</div>
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
  
  // DB RLS controls access to feed messages.

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30 font-body">
         <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" dir="rtl">
            <div className="container flex h-14 items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link href="/dashboard" className="flex items-center gap-3">
                      <span className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 shadow-sm">
                          <BrandLogo size={27} />
                        </span>
                        <span className="text-base font-bold font-headline text-primary relative top-[1px]">
                            FarsiFanConnect
                        </span>
                      </span>
                  </Link>
                  <Button variant="outline" onClick={() => router.back()} className="h-8 px-3 text-xs">
                      بازگشت
                  </Button>
                </div>
                {/* Removed profile avatar/link from feed header for a cleaner feed-only view */}
            </div>
        </header>

        <main className="flex-1 py-12 md:py-16">
            <div className="container max-w-4xl mx-auto">
                {/* Removed posts shortcut button; navigation lives on profile tabs */}
                {messages.length > 0 ? (
                  <div className="space-y-6">
                    {messages.map((msg) => (
                      <div key={msg.id} className="flex flex-row-reverse" dir="rtl">
                        <div className="flex flex-col items-end max-w-[80%]">
                          <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-3 shadow-sm">
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                          </div>
                          {msg.image_url && (
                            <div className="mt-2 rounded-lg overflow-hidden border bg-background">
                              <img
                                src={msg.image_url}
                                alt="تصویر فید"
                                className="h-auto w-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span>{new Date(msg.created_at).toLocaleString("fa-IR")}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-24 border-2 border-dashed rounded-lg bg-background">
                    <h3 className="text-2xl font-semibold">فعلاً به‌روزرسانی‌ای وجود ندارد</h3>
                    <p className="text-muted-foreground mt-3">
                      {creator.full_name} هنوز چیزی در فید خود پست نکرده است. به زودی برای محتوای جدید دوباره بررسی کنید!
                    </p>
                  </div>
                )}

                {isCreatorUser && (
                  <div className="mt-8 sticky bottom-4">
                    <FeedComposer creatorId={creatorId} onPosted={async () => {
                      const data = await listFeedMessages(creatorId);
                      setMessages(data);
                    }} />
                  </div>
                )}
            </div>
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
