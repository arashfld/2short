
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/supabase/service";

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
// Firebase removed: using Supabase auth only

const formSchema = z.object({
  email: z.string().email({ message: "لطفا یک ایمیل معتبر وارد کنید." }),
  password: z.string().min(1, { message: "رمز عبور الزامی است." }),
});

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
        if (!supabase) throw new Error('Supabase client not configured');
        const { data, error } = await supabase!.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        // Wait for session to be established
        let userId: string | null = null;
        for (let i = 0; i < 20; i++) {
          const { data: sess } = await supabase!.auth.getSession();
          userId = sess.session?.user?.id ?? null;
          if (userId) break;
          await new Promise(r => setTimeout(r, 200));
        }
        const profile = userId ? await getProfile(userId) : null;
        const target = profile?.role === 'creator' ? '/dashboard/creator' : '/dashboard';
        toast({
          title: "وارد شدید!",
          description: "خوش آمدید. در حال انتقال به داشبورد...",
        });
        router.push(target);
      } catch (error: any) {
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('confirm') || msg.includes('verified')) {
          toast({
            variant: "destructive",
            title: "تأیید ایمیل لازم است",
            description: "لطفاً ایمیل خود را تأیید کرده و سپس وارد شوید.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "ورود ناموفق",
            description: "ایمیل یا رمز عبور نادرست است.",
          });
        }
      } finally {
        setIsLoading(false);
      }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          ورود
        </Button>
      </form>
    </Form>
  );
}
