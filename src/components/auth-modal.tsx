"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LoginForm } from "./login-form";
import { SignUpForm } from "./signup-form";

export function AuthModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="bg-accent text-accent-foreground hover:bg-accent/90 transition-transform duration-300 ease-in-out hover:scale-105 shadow-lg"
        >
          شروع کنید
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[425px] bg-background font-body p-8"
        dir="rtl"
      >
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">ورود</TabsTrigger>
            <TabsTrigger value="signup">ثبت نام</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="pt-6">
            <DialogHeader className="text-right mb-4">
              <DialogTitle className="font-headline text-2xl">
                خوش آمدید
              </DialogTitle>
              <DialogDescription>
                برای دسترسی به حساب کاربری خود وارد شوید.
              </DialogDescription>
            </DialogHeader>
            <LoginForm />
          </TabsContent>
          <TabsContent value="signup" className="pt-6">
            <DialogHeader className="text-right mb-4">
              <DialogTitle className="font-headline text-2xl">
                ایجاد حساب کاربری
              </DialogTitle>
              <DialogDescription>
                به جامعه تولیدکنندگان و طرفداران فارسی ما بپیوندید.
              </DialogDescription>
            </DialogHeader>
            <SignUpForm />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
