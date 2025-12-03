"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { postFeedMessage } from "@/lib/supabase/service";
import { useToast } from "@/hooks/use-toast";

type Props = {
  creatorId: string;
  onPosted?: () => void;
};

export function FeedComposer({ creatorId, onPosted }: Props) {
  const { toast } = useToast();
  const [canPost, setCanPost] = useState(false);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setCanPost(!!user && user.id === creatorId);
    });
  }, [creatorId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(f.type)) {
      toast({ title: "فرمت نامعتبر", description: "تنها JPEG/PNG/WebP مجاز است", variant: "destructive" });
      return;
    }
    if (f.size > 10 * 1024 * 1024) { // 10MB
      toast({ title: "حجم زیاد", description: "حداکثر اندازه تصویر 10MB است", variant: "destructive" });
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!file || !supabase) return null;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `feed/${creatorId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from("post-assets").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("post-assets").getPublicUrl(data.path);
      return pub.publicUrl ?? null;
    } catch (e: any) {
      toast({ title: "خطا در آپلود", description: e?.message ?? "لطفاً دوباره تلاش کنید.", variant: "destructive" });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!supabase) return;
    if (!body.trim() && !file) {
      toast({ title: "متن یا تصویر لازم است", description: "یک پیام یا تصویر اضافه کنید." });
      return;
    }
    setPosting(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || user.id !== creatorId) {
        toast({ title: "دسترسی نامعتبر", description: "فقط خود سازنده می‌تواند پست کند.", variant: "destructive" });
        return;
      }
      let imageUrl: string | null = null;
      if (file) {
        imageUrl = await uploadImage();
      }
      const bodyToSave = body.trim();
      await postFeedMessage({
        creator_id: creatorId,
        author_id: user.id,
        body: bodyToSave,
        image_url: imageUrl ?? null,
      });
      setBody("");
      setFile(null);
      setPreviewUrl(null);
      toast({ title: "منتشر شد", description: "پیام شما به فید اضافه شد." });
      onPosted?.();
    } catch (e: any) {
      toast({ title: "خطا در انتشار", description: e?.message ?? "لطفاً دوباره تلاش کنید.", variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  if (!canPost) return null;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3" dir="rtl">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="متن به‌روزرسانی..."
        className="resize-none"
      />
      <div className="flex items-center gap-3">
        <Input type="file" accept="image/*" onChange={handleFileChange} />
        <Button onClick={submit} disabled={uploading || posting}>
          {posting ? "در حال انتشار..." : "انتشار"}
        </Button>
      </div>
      {previewUrl && (
        <div className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="پیش‌نمایش" className="max-h-48 rounded-md" />
        </div>
      )}
    </div>
  );
}