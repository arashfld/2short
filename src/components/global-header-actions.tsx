"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/supabase/service";

export function GlobalHeaderActions() {
  const [hasUser, setHasUser] = useState(false);
  const [targetHref, setTargetHref] = useState<string>("/");

  useEffect(() => {
    let isMounted = true;
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const user = data.session?.user ?? null;
        if (!isMounted) return;
        setHasUser(!!user);
        if (user) {
          try {
            const profile = await getProfile(user.id);
            if (!isMounted) return;
            setTargetHref(profile?.role === 'creator' ? '/dashboard/creator' : '/dashboard');
          } catch (_) {
            setTargetHref('/dashboard');
          }
        } else {
          // Logged out: keep user on homepage (or link to auth page if available)
          setTargetHref('/');
        }
      })
      .catch(() => {
        // swallow Supabase refresh/fetch errors; default route
        if (!isMounted) return;
        setHasUser(false);
        setTargetHref('/');
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      if (!isMounted) return;
      setHasUser(!!user);
      if (user) {
        getProfile(user.id)
          .then((profile) => {
            if (!isMounted) return;
            setTargetHref(profile?.role === 'creator' ? '/dashboard/creator' : '/dashboard');
          })
          .catch(() => {
            if (!isMounted) return;
            setTargetHref('/dashboard');
          });
      } else {
        setTargetHref('/');
      }
    });
    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="fixed top-4 left-4 z-50" dir="rtl">
      <Link href={targetHref}>
        <span
          className={buttonVariants({ variant: hasUser ? "default" : "outline", size: "sm" })}
        >
          {hasUser ? "داشبورد" : "ورود"}
        </span>
      </Link>
    </div>
  );
}