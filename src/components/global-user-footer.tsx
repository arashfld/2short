"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/supabase/service";
import { User as UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function GlobalUserFooter() {
  const [name, setName] = useState<string>("");
  const [settingsHref, setSettingsHref] = useState<string>("/settings");
  const pathname = usePathname();

  useEffect(() => {
    if (!supabase) return; // Guard when Supabase client is not configured
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await supabase!.auth.getSession();
        const user = data.session?.user ?? null;
        if (!mounted) return;
        if (user) {
          try {
            const profile = await getProfile(user.id);
            if (!mounted) return;
            const display = profile?.full_name || user.email || "";
            setName(display || "");
            setSettingsHref(profile?.role === "creator" ? "/dashboard/creator/settings" : "/settings");
          } catch {
            setName(user.email || "");
            setSettingsHref("/settings");
          }
        } else {
          setName("");
          setSettingsHref("/settings");
        }
      } catch {
        // ignore
      }
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      if (!mounted) return;
      if (user) {
        getProfile(user.id)
          .then((profile) => {
            if (!mounted) return;
            const display = profile?.full_name || user.email || "";
            setName(display || "");
            setSettingsHref(profile?.role === "creator" ? "/dashboard/creator/settings" : "/settings");
          })
          .catch(() => {
            if (!mounted) return;
            setName(user.email || "");
            setSettingsHref("/settings");
          });
      } else {
        setName("");
        setSettingsHref("/settings");
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Only show on dashboard routes
  if (!pathname?.startsWith("/dashboard")) return null;

  return (
    <Link href={settingsHref}>
      <div
        className="fixed bottom-4 left-4 z-50 rounded-full bg-secondary text-secondary-foreground shadow-md px-4 py-2 flex items-center gap-2 hover:bg-secondary/80"
        dir="rtl"
      >
        <UserIcon className="h-4 w-4" />
        <span className="text-sm font-medium">{name || "تنظیمات"}</span>
      </div>
    </Link>
  );
}