"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { updateProfile } from "@/lib/supabase/service";

type Props = {
  userId: string;
  kind: "profile" | "banner";
  label?: string;
  initialUrl?: string | null;
  onUploaded?: (url: string) => void;
};

export function ImageUploader({ userId, kind, label, initialUrl, onUploaded }: Props) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(initialUrl || undefined);
  const [useLink, setUseLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const accept = "image/jpeg,image/png,image/webp";

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!supabase) {
      toast({ title: "پیکربندی Supabase وجود ندارد", description: "مقادیر محیطی NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY را تنظیم کنید.", variant: "destructive" });
      return;
    }
    if (!accept.split(",").includes(file.type)) {
      toast({ title: "نوع فایل نامعتبر است", description: "لطفاً یکی از فرمت‌های JPEG/PNG/WebP را انتخاب کنید.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "فایل بزرگ است", description: "حداکثر اندازه مجاز ۵ مگابایت است.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${kind}-${Date.now()}.${ext}`;
      const bucket = supabase!.storage.from("profile-assets");
      const { error: uploadError } = await bucket.upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data } = bucket.getPublicUrl(path);
      const publicUrl = data.publicUrl;
      setPreviewUrl(publicUrl);

      // Persist to profile
      if (kind === "profile") {
        await updateProfile(userId, { avatar_url: publicUrl, profile_image_url: publicUrl });
      } else {
        await updateProfile(userId, { banner_image_url: publicUrl });
      }

      toast({ title: "تصویر آپلود شد", description: "تصویر با موفقیت ذخیره شد." });
      onUploaded?.(publicUrl);
    } catch (e: any) {
      toast({ title: "خطا در آپلود", description: e?.message || "لطفاً دوباره تلاش کنید.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const saveLink = async () => {
    if (!linkUrl || !/^https?:\/\//i.test(linkUrl)) {
      toast({ title: "لینک نامعتبر", description: "یک آدرس معتبر با http/https وارد کنید.", variant: "destructive" });
      return;
    }
    // Basic extension check to avoid pasting webpage URLs (prevents ORB errors)
    const isImageExt = /(\.jpe?g|\.png|\.webp|\.gif)(\?.*)?(#.*)?$/i.test(linkUrl);
    if (!isImageExt) {
      toast({
        title: "لینک تصویر نامعتبر",
        description: "لطفاً لینک مستقیم فایل تصویر (jpg/png/webp/gif) وارد کنید، نه آدرس صفحه وب.",
        variant: "destructive",
      });
      return;
    }
    if (!supabase) {
      toast({ title: "پیکربندی Supabase وجود ندارد", description: "مقادیر محیطی NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY را تنظیم کنید.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      setPreviewUrl(linkUrl);
      if (kind === "profile") {
        await updateProfile(userId, { avatar_url: linkUrl, profile_image_url: linkUrl });
      } else {
        await updateProfile(userId, { banner_image_url: linkUrl });
      }
      toast({ title: "تصویر ذخیره شد", description: "لینک با موفقیت ثبت شد." });
      onUploaded?.(linkUrl);
    } catch (e: any) {
      toast({ title: "خطا در ذخیره", description: e?.message || "لطفاً دوباره تلاش کنید.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      {previewUrl ? (
        <img src={previewUrl} alt="preview" className="w-full max-w-sm rounded-md border" />
      ) : (
        <div className="w-full max-w-sm h-32 rounded-md border bg-muted" />
      )}
      <div className="flex items-center gap-2">
        {useLink ? (
          <>
            <Input
              key="urlInput"
              type="url"
              placeholder="https://example.com/image.jpg (direct image URL)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <Button type="button" onClick={saveLink} isLoading={isUploading} disabled={isUploading}>
              ذخیره
            </Button>
          </>
        ) : (
          <>
            <Input
              key="fileInput"
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button type="button" onClick={() => fileInputRef.current?.click()} isLoading={isUploading} disabled={isUploading}>
              انتخاب فایل
            </Button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => setUseLink((v) => !v)} disabled={isUploading}>
          {useLink ? "استفاده از آپلود فایل" : "استفاده از لینک"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">JPEG, PNG یا WebP تا ۵ مگابایت</p>
    </div>
  );
}