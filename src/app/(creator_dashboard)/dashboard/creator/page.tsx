
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListVideo } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, listFeedMessages } from "@/lib/supabase/service";
import type { FeedMessage } from "@/lib/supabase/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";

export default function CreatorDashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null);
  const [feedMessages, setFeedMessages] = useState<FeedMessage[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase!.auth.getUser();
        const user = data.user;
        if (!user) return;
        setUserId(user.id);
        const profile = await getProfile(user.id);
        if (!mounted || !profile) return;
        setProfileImageUrl(profile.profile_image_url || profile.avatar_url || null);
        setBannerImageUrl(profile.banner_image_url || null);
        // Show onboarding if missing either image
        if (!profile.profile_image_url && !profile.avatar_url || !profile.banner_image_url) {
          setShowOnboarding(true);
        }

        // Fetch creator's live feed messages
        setFeedLoading(true);
        try {
          const msgs = await listFeedMessages(user.id);
          if (mounted) setFeedMessages(msgs);
        } catch (_) {
          if (mounted) setFeedMessages([]);
        } finally {
          if (mounted) setFeedLoading(false);
        }
      } catch (_) {
        // ignore onboarding errors to keep dev logs quiet
      }
    })();
    return () => { mounted = false };
  }, []);
 
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-8">
        <div className="py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">فید زنده شما</h2>
            <div className="flex items-center gap-3">
              {userId && (
                <a href={`/creators/${userId}/feed`}>
                  <Button variant="outline">مشاهده صفحه فید</Button>
                </a>
              )}
              <ListVideo className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          {feedLoading ? (
            <div className="text-center py-12 text-muted-foreground">در حال بارگذاری فید...</div>
          ) : feedMessages.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                هنوز پیامی در فید ندارید.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {feedMessages.map((msg) => (
                <Card key={msg.id}>
                  <CardHeader>
                    <CardTitle className="text-base">پیام</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <p className="whitespace-pre-line">{msg.body}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString('fa-IR')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>شروع کار: آپلود تصاویر پروفایل و بنر</DialogTitle>
            <DialogDescription>
              برای نمایش بهتر در صفحه عمومی، لطفاً تصویر پروفایل و بنر خود را آپلود کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userId && (
              <>
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
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setShowOnboarding(false)}
              disabled={!profileImageUrl || !bannerImageUrl}
            >
              ادامه
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
