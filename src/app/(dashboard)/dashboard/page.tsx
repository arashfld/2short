
'use client';

import Link from "next/link";
import Image from "next/image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { listSubscriptionsByUser, getProfilesByIds } from "@/lib/supabase/service";
import type { Profile } from "@/lib/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const [subscribedCreators, setSubscribedCreators] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [chooserOpen, setChooserOpen] = useState(false);
    const [activeCreatorId, setActiveCreatorId] = useState<string | null>(null);
    const [activeCreatorName, setActiveCreatorName] = useState<string>("");

    useEffect(() => {
        const fetchCreatorProfiles = async () => {
            try {
                setLoading(true);
                if (!supabase) {
                    setSubscribedCreators([]);
                    return;
                }
                const { data, error } = await supabase.auth.getUser();
                const user = data?.user;
                if (!user || error) {
                    setSubscribedCreators([]);
                    return;
                }
                const subs = await listSubscriptionsByUser(user.id);
                const creatorIds = subs.map(s => s.creator_id).filter(Boolean);
                if (creatorIds.length === 0) {
                    setSubscribedCreators([]);
                    return;
                }
                const profiles = await getProfilesByIds(creatorIds);
                setSubscribedCreators(profiles);

            } catch (_) {
                // ignore errors to reduce dev noise; UI will show empty state
                setSubscribedCreators([]);
            } finally {
                setLoading(false);
            }
        };
        fetchCreatorProfiles();
    }, []);

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold font-headline text-right">داشبورد شما</h1>
            <p className="text-muted-foreground mt-2 text-right">
                فیدهای تولیدکنندگان محتوای مورد علاقه خود را مشاهده کنید.
            </p>
        </div>

        {loading ? (
             <div className="text-center py-16">
                <p>در حال بارگذاری اشتراک‌های شما...</p>
            </div>
        ) : subscribedCreators.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {subscribedCreators.map((creator) => (
                    <a
                      href={`/creators/${creator.id}`}
                      key={creator.id}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveCreatorId(creator.id);
                        setActiveCreatorName(creator.full_name || "");
                        setChooserOpen(true);
                      }}
                    >
                        <Card className="overflow-hidden text-center transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-xl">
                            <CardContent className="p-0">
                                <div className="relative aspect-square">
                                    {creator.avatar_url ? (
                                      <Image
                                        src={creator.avatar_url}
                                        alt={creator.full_name || ''}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="absolute inset-0 bg-gradient-to-br from-muted/30 via-muted to-muted-foreground/20" aria-hidden="true" />
                                    )}
                                </div>
                                <div className="p-3">
                                    <h3 className="font-semibold text-sm truncate">{creator.full_name}</h3>
                                </div>
                            </CardContent>
                        </Card>
                    </a>
                ))}
            </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">شما هنوز هیچ تولیدکننده محتوایی را دنبال نکرده‌اید</h3>
            <p className="text-muted-foreground mt-2">
              برای دیدن فیدهایشان در اینجا، تولیدکنندگان محتوا را کاوش و دنبال کنید.
            </p>
            <Link
              href="/explore"
              className={buttonVariants({ variant: "default", size: "default" }) + " mt-4"}
            >
              کاوش تولیدکنندگان
            </Link>
          </div>
        )}

        {/* Navigation choice modal */}
        <DashboardChooserModal
          open={chooserOpen}
          onOpenChange={(v) => setChooserOpen(v)}
          creatorId={activeCreatorId}
          creatorName={activeCreatorName}
        />
      </div>
    </div>
  );
}

// Inline modal for navigation choice
function DashboardChooserModal({ open, onOpenChange, creatorId, creatorName }: { open: boolean; onOpenChange: (v: boolean) => void; creatorId: string | null; creatorName: string; }) {
  const router = useRouter();
  const handleNavigate = (path: string) => {
    onOpenChange(false);
    setTimeout(() => {
      try {
        router.push(path);
      } catch (_) {
        // Fallback to hard navigation
        window.location.assign(path);
      }
    }, 0);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>کجا می‌خواهید بروید؟</DialogTitle>
          <DialogDescription>
            برای {creatorName} یکی از گزینه‌های زیر را انتخاب کنید.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex items-center justify-end gap-2">
          <Button
            variant="default"
            onClick={() => {
              if (creatorId) {
                handleNavigate(`/creators/${creatorId}/feed`);
              }
            }}
          >
            مشاهده فید
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (creatorId) {
                handleNavigate(`/creators/${creatorId}`);
              }
            }}
          >
            مشاهده پست‌ها
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
