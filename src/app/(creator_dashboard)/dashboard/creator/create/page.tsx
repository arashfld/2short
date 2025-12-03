
'use client';

import { PostComposer, PostFormValues } from "@/components/post-composer";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/supabase/service";

interface CreatorInfo {
  id: string;
  fullName: string;
  imageUrl?: string | null;
  email?: string | null;
}

export default function CreatePostPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [creator, setCreator] = useState<CreatorInfo | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!supabase) return;
            const { data, error } = await supabase.auth.getUser();
            if (error) {
                return;
            }
            const sbUser = data.user;
            if (!sbUser) return;
            try {
                const profile = await getProfile(sbUser.id);
                if (mounted && profile) {
                    setCreator({
                        id: profile.id,
                        fullName: profile.full_name ?? 'کاربر',
                        imageUrl: profile.avatar_url,
                        email: profile.email,
                    });
                }
            } catch (e) {
            }
        })();
        return () => { mounted = false };
    }, []);

    const handlePost = async (data: PostFormValues) => {
        if (!supabase || !creator) {
            toast({
                title: "خطای احراز هویت",
                description: "برای ایجاد پست باید وارد شوید.",
                variant: "destructive",
            });
            return;
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
            toast({
                title: "خطای احراز هویت",
                description: "برای ایجاد پست باید وارد شوید.",
                variant: "destructive",
            });
            return;
        }

        try {
            // Resolve image: upload file to Supabase Storage if provided, otherwise use pasted URL
            let resolvedImageUrl = data.imageUrl || '';
            if (!resolvedImageUrl && data.image && (data.image as FileList)?.length > 0) {
                const file = (data.image as FileList)[0];
                if (!file) {
                    throw new Error('پرونده‌ای برای آپلود انتخاب نشده است.');
                }
                if (!/^image\//.test(file.type)) {
                    throw new Error('فقط فرمت‌های تصویری مجاز هستند.');
                }
                if (file.size > 5 * 1024 * 1024) {
                    throw new Error('حداکثر اندازه فایل ۵ مگابایت است.');
                }

                const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
                const slugBase = data.title
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^\w-]+/g, '');
                const path = `${authData.user.id}/posts/${slugBase}-${Date.now()}.${ext}`;
                const bucket = supabase.storage.from('post-assets');
                const { error: uploadError } = await bucket.upload(path, file, { contentType: file.type, upsert: true });
                if (uploadError) throw uploadError;
                const { data: pub } = bucket.getPublicUrl(path);
                resolvedImageUrl = pub.publicUrl;
            }

            const slug = data.title
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]+/g, '');

            // Use API route to enforce backend image URL validation
            const creatorEmail = creator.email || authData.user.email || '';
            const res = await fetch('/api/supabase/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                creatorEmail,
                slug,
                title: data.title,
                content: data.content,
                imageUrl: resolvedImageUrl || null,
                requiredTierLevel: parseInt(data.requiredTier, 10),
              })
            });
            const json = await res.json();
            if (!res.ok) {
              throw new Error(json?.error || 'خطا در ایجاد پست');
            }

            toast({
                title: "پست با موفقیت ایجاد شد!",
                description: "تصویر در Storage و پست با اعتبارسنجی لینک ذخیره شد.",
            });

            router.push(`/dashboard/creator/posts`);
        } catch (error) {
            toast({
                title: "خطا در ایجاد پست",
                description: "مشکلی در ذخیره پست شما به وجود آمد. لطفاً دوباره تلاش کنید.",
                variant: "destructive",
            });
        }
    };

    if (!creator) {
        // Could add a loading skeleton here
        return <div className="text-center p-8">Loading creator profile...</div>;
    }

    return (
        <div className="container mx-auto max-w-3xl py-8" dir="rtl">
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline text-right">ایجاد پست جدید</h1>
                    <p className="text-muted-foreground mt-2 text-right">
                        محتوای جدیدی برای مشترکین خود بسازید.
                    </p>
                </div>
                <PostComposer onPost={handlePost} creator={creator} />
            </div>
        </div>
    );
}
