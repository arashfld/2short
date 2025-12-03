
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "./ui/separator";

const formSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "نام کامل باید حداقل ۲ حرف داشته باشد." }),
  email: z.string().email({ message: "لطفا یک ایمیل معتبر وارد کنید." }),
  password: z
    .string()
    .min(6, { message: "رمز عبور باید حداقل ۶ حرف داشته باشد." }),
});

export function SignUpForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
        if (!supabase) {
          toast({
            title: "خطای پیکربندی",
            description: "تنظیمات Supabase یافت نشد. لطفاً فایل .env.local و مقادیر NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY را بررسی کنید و سپس سرور را ری‌استارت کنید.",
            variant: "destructive",
          });
          return;
        }
        const { data, error } = await supabase!.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: { full_name: values.fullName }
          }
        });
        if (error) throw error;
        // Wait for session to be established for RLS
        let userId: string | null = null;
        for (let attempts = 0; attempts < 20; attempts++) {
          const { data: sessionData } = await supabase!.auth.getSession();
          userId = sessionData?.session?.user?.id ?? null;
          if (userId) break;
          await new Promise(r => setTimeout(r, 200));
        }
        if (!userId) {
          toast({
            title: "نیاز به تأیید ایمیل",
            description: "لطفاً ایمیل را تأیید کنید و سپس وارد شوید.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "ثبت نام شما (به عنوان طرفدار) موفق بود!",
          description: "در حال هدایت به داشبورد شما...",
        });
        router.push('/dashboard');
    } catch (error: any) {
        const msg = (error?.message || "لطفاً دوباره تلاش کنید.");
        const isNetworkFail = /Failed to fetch/i.test(msg);
        toast({
            title: isNetworkFail ? "عدم اتصال به Supabase" : "ثبت نام ناموفق بود",
            description: isNetworkFail
              ? "در اتصال به سرویس Supabase مشکلی پیش آمد. اینترنت/فایروال را بررسی کنید یا آدرس پروژه در .env.local صحیح باشد."
              : msg,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نام کامل</FormLabel>
              <FormControl>
                <Input placeholder="نام شما" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ایمیل</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} dir="ltr" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>رمز عبور</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} dir="ltr" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          isLoading={isLoading}
        >
          ایجاد حساب کاربری طرفدار
        </Button>
      </form>
      <Separator className="my-6" />
      <div className="text-center">
        <Link href="/auth/creator-signup" className="text-sm text-primary hover:underline">
          تولیدکننده محتوا هستید؟ از اینجا ثبت نام کنید.
        </Link>
      </div>
    </Form>
  );
}
