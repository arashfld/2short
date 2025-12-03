
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listCreators } from "@/lib/supabase/service";
import type { Profile } from "@/lib/supabase/types";

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [creators, setCreators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const data = await listCreators();
        setCreators(data);
      } catch (e) {
        setCreators([]);
      }
      setLoading(false);
    };
    run();
  }, []);

  const allCreators = useMemo(() => {
    return creators;
  }, [creators]);


  const filteredCreators = allCreators.filter((creator) =>
    (creator.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">کاوش</h1>
        <p className="text-muted-foreground mt-2">
          تولیدکنندگان محتوای جدید و هیجان‌انگیز را کشف کنید.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="جستجوی تولیدکنندگان..."
          className="pl-10"
          dir="rtl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {loading ? (
        <div className="text-center py-16"><p>در حال بارگذاری تولیدکنندگان...</p></div>
      ) : filteredCreators.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">تولیدکننده‌ای یافت نشد. شاید هنوز کسی ثبت‌نام نکرده است.</p>
          <p className="mt-2">اگر تولیدکننده هستید، می‌توانید از داشبورد ثبت‌نام کنید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCreators.map((creator) => (
            <Link href={`/creators/${creator.id}`} key={creator.id}>
              <Card
                className="overflow-hidden transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-xl"
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
  );
}
