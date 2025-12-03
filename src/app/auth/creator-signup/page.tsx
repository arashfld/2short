
'use client';

import { CreatorSignUpForm } from "@/components/creator-signup-form";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

export default function CreatorSignUpPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase!.auth.getUser();
      if (mounted && data.user) {
        router.push("/dashboard/creator");
      }
    })();
    return () => { mounted = false };
  }, [router]);


  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-background font-body p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <span className="flex items-center gap-3">
                <BrandLogo />
                <span className="text-2xl font-bold font-headline text-primary">
                    FarsiFanConnect
                </span>
              </span>
            </Link>
          <h1 className="text-3xl font-bold font-headline">به عنوان تولیدکننده محتوا ثبت نام کنید</h1>
          <p className="text-muted-foreground mt-2">به جامعه ما از استعدادهای فارسی بپیوندید.</p>
        </div>
        <CreatorSignUpForm />
        <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
                قبلاً حساب کاربری دارید؟{' '}
                <Link href="/" className="underline">
                    وارد شوید
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
}
