
'use client';
import { Sidebar } from "@/components/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/supabase/service";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasUser, setHasUser] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      try {
        if (!supabase) { setIsLoading(false); return; }
        // Prefer session to avoid race conditions
        let userId: string | null = null;
        for (let i = 0; i < 10; i++) {
          const { data: sess } = await supabase.auth.getSession();
          userId = sess.session?.user?.id ?? null;
          if (userId) break;
          await new Promise(r => setTimeout(r, 150));
        }
        if (!userId) {
          setHasUser(false);
          setIsLoading(false);
          router.push('/');
          return;
        }
        setHasUser(true);
        const profile = await getProfile(userId);
        if (profile?.role === 'creator') {
          router.push('/dashboard/creator');
          return;
        }
      } catch (_) {
        // swallow errors to avoid noisy logs in dev; UI guard covers redirect
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [router]);

  if (isLoading || !hasUser) {
    return <div className="flex h-screen items-center justify-center">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background font-body" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
