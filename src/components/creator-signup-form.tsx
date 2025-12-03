
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from 'next/navigation';
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
import { updateProfile } from "@/lib/supabase/service";

const formSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "نام کامل باید حداقل ۲ حرف داشته باشد." }),
  phoneNumber: z.string().min(10, { message: "لطفا یک شماره تلفن معتبر وارد کنید." }),
  email: z.string().email({ message: "لطفا یک ایمیل معتبر وارد کنید." }),
  password: z
    .string()
    .min(6, { message: "رمز عبور باید حداقل ۶ حرف داشته باشد." }),
});

export function CreatorSignUpForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
        const { data, error } = await supabase!.auth.signUp({
          email: values.email,
          password: values.password,
          options: { data: { full_name: values.fullName, role: 'creator' } },
        });
        if (error) throw error;
        // Wait for session to be established to satisfy RLS
        let userId: string | null = null;
        for (let tries = 0; tries < 20; tries++) {
          const { data: sess } = await supabase!.auth.getSession();
          userId = sess.session?.user?.id ?? null;
          if (userId) break;
          await new Promise(r => setTimeout(r, 250));
        }
        if (!userId) {
          toast({
            title: "نیاز به تأیید ایمیل",
            description: "لطفاً ایمیل را تأیید کنید و سپس ادامه دهید.",
            variant: "destructive",
          });
          return;
        }
        // RLS-safe update (row created by trigger/backfill)
        await updateProfile(userId, { full_name: values.fullName, role: 'creator', email: values.email });
        toast({
            title: "ثبت نام شما (به عنوان تولیدکننده) موفق بود!",
            description: "در حال هدایت به داشبورد شما...",
        });
        router.push('/dashboard/creator');
    } catch(error: any) {
        toast({
            title: "ثبت نام ناموفق بود",
            description: error.message || "لطفاً دوباره تلاش کنید.",
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
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>شماره تلفن</FormLabel>
              <FormControl>
                <Input placeholder="09123456789" {...field} dir="ltr" />
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
          ایجاد حساب تولیدکننده
        </Button>
      </form>
    </Form>
  );
}
