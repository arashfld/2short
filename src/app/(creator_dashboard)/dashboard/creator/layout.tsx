
'use client';

import { CreatorSidebar } from "@/components/creator-sidebar";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/supabase/service";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CreatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data } = await supabase!.auth.getUser();
        const user = data.user;
        if (!user) { router.push('/'); setIsLoading(false); return; }
        const profile = await getProfile(user.id);
        if (profile?.role !== 'creator') {
          router.push('/dashboard');
        }
      } catch (_) {
        // swallow errors to keep dev logs quiet
      } finally {
        setIsLoading(false);
      }
    }
    checkUser();
  }, [router]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">در حال بارگذاری...</div>;
  }
  
  return (
    <div className="flex min-h-screen bg-background font-body" dir="rtl">
      <CreatorSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
