
'use client';

import { PostCard } from "@/components/post-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Post as SbPost } from "@/lib/supabase/types";
import { useEffect, useState } from "react";

export default function ManagePostsPage() {
  const [posts, setPosts] = useState<SbPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserTier, setCurrentUserTier] = useState(0); // Creator can see all their posts

  // In a real scenario, a creator would have the highest tier to see their own content
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase!.auth.getUser();
      const user = data.user;
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUserTier(3);
      setLoading(true);
      try {
        const res = await fetch(`/api/supabase/creators/${user.id}/posts`);
        const json = await res.json();
        setPosts(Array.isArray(json?.posts) ? json.posts : []);
      } catch {
        setPosts([]);
      }
      setLoading(false);
    };
    run();
  }, []);

  const handleDelete = async (postId: string) => {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    const ok = confirm("آیا از حذف این پست مطمئن هستید؟");
    if (!ok) return;
    try {
      const res = await fetch('/api/supabase/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorEmail: user.email, postId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'خطا در حذف پست');
      setPosts((prev) => prev.filter(p => p.id !== postId));
    } catch (e) {
      // You could add a toast here, keeping minimal footprint per request
      console.error(e);
    }
  };


  return (
    <div className="container mx-auto py-8" dir="rtl">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline text-right">مدیریت پست‌ها</h1>
            <p className="text-muted-foreground mt-2 text-right">
              پست‌های منتشر شده خود را مشاهده و ویرایش کنید.
            </p>
          </div>
          <Link href="/dashboard/creator/create">
            <Button>ایجاد پست جدید</Button>
          </Link>
        </div>

        {loading ? (
            <div className="text-center py-16">
                <p>در حال بارگذاری پست ها...</p>
            </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <div key={post.id} className="relative group">
                <PostCard post={post} currentUserTier={currentUserTier} imageUrl={post.image_url ?? undefined} imageHint="post image" />
                <button
                  type="button"
                  onClick={() => handleDelete(post.id)}
                  className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-md bg-destructive/90 text-destructive-foreground px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="حذف پست"
                >
                  <Trash className="h-3 w-3" /> حذف
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">هنوز پستی منتشر نکرده‌اید</h3>
            <p className="text-muted-foreground mt-2">
              اولین پست خود را ایجاد کنید تا در اینجا نمایش داده شود.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
