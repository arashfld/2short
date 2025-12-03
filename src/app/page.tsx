
'use client';
import Image from 'next/image';
import { AuthModal } from '@/components/auth-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Gem, BarChart } from 'lucide-react';
import { TypingEffect } from '@/components/typing-effect';
import { BrandLogo } from '@/components/brand-logo';
import { GlobalHeaderActions } from '@/components/global-header-actions';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listCreators } from '@/lib/supabase/service';
import type { Profile } from '@/lib/supabase/types';


export default function Home() {
  const [featuredCreators, setFeaturedCreators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const creators = await listCreators();
        setFeaturedCreators(creators.slice(0, 4));
      } catch (e) {
        setFeaturedCreators([]);
      }
      setLoading(false);
    };
    run();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <header className="absolute top-0 left-0 w-full z-30 p-4 sm:p-6 flex justify-between items-center" dir="rtl">
        <div className="flex items-center gap-3">
          <BrandLogo />
          <span className="text-base font-bold font-headline text-primary-foreground relative top-[1px]">
            FarsiFanConnect
          </span>
        </div>
      </header>
      {/* Dashboard action button only on homepage */}
      <GlobalHeaderActions />

      <main className="flex-1">
        <section className="relative flex flex-col items-center justify-center text-center p-4 min-h-screen overflow-hidden">
          <div className="absolute inset-0 z-0">
            {/* Background image */}
            <Image
              src="/bg.jpg"
              alt=""
              fill
              priority
              className="object-cover"
            />
            {/* Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-background" />
          </div>
          <div
            className="relative z-10 flex flex-col items-center justify-center h-full animate-fade-in space-y-6 max-w-5xl mx-auto"
            dir="rtl"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-headline text-primary-foreground drop-shadow-lg whitespace-nowrap">
              متصل شو. خلق کن. شکوفا شو.
            </h1>
            <TypingEffect />
            <div className="pt-4">
              <AuthModal />
            </div>
          </div>
        </section>

        <section id="features" className="py-20 sm:py-32 bg-background" dir="rtl">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold font-headline">چگونه کار می‌کند؟</h2>
              <p className="text-muted-foreground mt-2 text-lg">
                به سادگی در سه مرحله به FarsiFanConnect بپیوندید.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">۱. ثبت‌نام کنید</h3>
                <p className="text-muted-foreground">
                  یک حساب کاربری به عنوان تولیدکننده محتوا یا طرفدار ایجاد کنید.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4">
                  <Gem className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">۲. محتوای ویژه ارائه دهید</h3>
                <p className="text-muted-foreground">
                  محتوای انحصاری مانند ویدیوها، پست‌ها و موارد دیگر را با طرفداران خود به اشتراک بگذارید.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4">
                  <BarChart className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">۳. جامعه خود را رشد دهید</h3>
                <p className="text-muted-foreground">
                  با طرفداران خود تعامل داشته باشید و پایگاه هواداران وفادار خود را بسازید.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="creators" className="py-20 sm:py-32 bg-secondary" dir="rtl">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold font-headline">
                تولیدکنندگان محتوای برجسته
              </h2>
              <p className="text-muted-foreground mt-2 text-lg">
                برخی از استعدادهای شگفت‌انگیز در پلتفرم ما را کشف کنید.
              </p>
            </div>
            {loading && featuredCreators.length === 0 ? (
                <div className="text-center"><p>در حال بارگذاری تولیدکنندگان...</p></div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredCreators.map((creator) => (
                <Link href={`/creators/${creator.id}`} key={creator.id}>
                  <Card
                    className="overflow-hidden transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-xl h-full"
                  >
                    <CardContent className="p-0">
                      <div className="relative aspect-[3/4]">
                        {creator.avatar_url ? (
                          <Image
                            src={creator.avatar_url}
                            alt={creator.full_name || ''}
                            fill
                            className="object-cover"
                            data-ai-hint={'profile picture'}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-muted/30 via-muted to-muted-foreground/20" aria-hidden="true" />
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-lg">{creator.full_name}</h3>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            )}
          </div>
        </section>
      </main>

      <footer className="w-full py-6 text-center bg-background z-10 relative" dir="rtl">
        <div className="container mx-auto">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FarsiFanConnect. تمام حقوق محفوظ است.
          </p>
        </div>
      </footer>
    </div>
  );
}
