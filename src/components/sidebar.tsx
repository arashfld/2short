
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Compass, User, LogOut, Settings, Newspaper, MessageCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { getProfile, getUnreadMessageCount } from "@/lib/supabase/service";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";

const navItems = [
  { href: "/dashboard", label: "پست‌ها", icon: Newspaper },
  { href: "/explore", label: "کاوش", icon: Compass },
  { href: "/dashboard/messages", label: "پیام‌ها", icon: MessageCircle },
];

const bottomNavItems = [
  { href: "/settings", label: "تنظیمات", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [hasUser, setHasUser] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      setHasUser(!!user);
      if (user) {
        try {
          const profile = await getProfile(user.id);
          const name = profile?.full_name || user.email || "";
          setDisplayName(name || "");
          const count = await getUnreadMessageCount(user.id);
          setUnreadCount(count);
        } catch {
          setDisplayName(user.email || "");
        }
      } else {
        setDisplayName("");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setHasUser(!!user);
      if (user) {
        getProfile(user.id)
          .then(async (profile) => {
            const name = profile?.full_name || user.email || "";
            setDisplayName(name || "");
            const count = await getUnreadMessageCount(user.id);
            setUnreadCount(count);
          })
          .catch(() => {
            setDisplayName(user.email || "");
          });
      } else {
        setDisplayName("");
      }
    });
    
    // Poll for unread messages every 30 seconds
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const count = await getUnreadMessageCount(data.user.id);
        setUnreadCount(count);
      }
    }, 30000);
    
    return () => { 
      sub.subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      if (!supabase) throw new Error('Supabase client not configured');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "خارج شدید",
        description: "شما با موفقیت از حساب کاربری خود خارج شدید.",
      });
      router.push('/');
    } catch (error) {
      toast({
        title: "خطا در خروج",
        description: "مشکلی در هنگام خروج از حساب کاربری شما به وجود آمد.",
        variant: "destructive",
      });
    }
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-secondary/50 flex flex-col p-4 space-y-4">
      <Link href="/dashboard" className="flex items-center gap-3 px-2 pb-4">
        <span className="flex items-center gap-3">
          <span className="inline-flex shrink-0 h-8 w-8 items-center justify-center rounded-full bg-primary/10 shadow-sm">
            <BrandLogo size={27} />
          </span>
          <span className="text-base font-bold font-headline text-primary relative top-[1px]">FarsiFanConnect</span>
        </span>
      </Link>
      <nav className="flex-1 flex flex-col space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground",
              pathname === item.href && "bg-primary text-primary-foreground"
            )}
          >
            <span className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </span>
            {item.href === "/dashboard/messages" && unreadCount > 0 && (
              <Badge variant="destructive" className="mr-auto rounded-full px-2 py-0.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col space-y-2">
        {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground",
              pathname === item.href && "bg-primary text-primary-foreground"
            )}
          >
            <span className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span>{item.href === "/settings" && displayName ? displayName : item.label}</span>
            </span>
          </Link>
        ))}
         {hasUser && (
          <Button variant="ghost" onClick={handleSignOut} className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground justify-start">
            <LogOut className="h-5 w-5" />
            <span>خروج</span>
          </Button>
        )}
      </div>
    </aside>
  );
}
