
"use client";

import Image from "next/image";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { Post as SbPost } from "@/lib/supabase/types";

interface PostCardProps {
  post: SbPost;
  imageUrl?: string; // optional hero image url
  imageHint?: string;
  // With Supabase RLS, locked posts won’t be returned in lists.
  // Keep this for UI parity where needed.
  currentUserTier?: number;
}

export function PostCard({ post, currentUserTier = 0, imageUrl, imageHint = "post image" }: PostCardProps) {
  const requiredTier = post.required_tier_level;
  const isLocked = requiredTier > currentUserTier;
  const hasImage = !!imageUrl;
  const isExternal = !!imageUrl && /^https?:\/\//.test(imageUrl);
  let contentText = typeof post.content === 'string' ? post.content : post.content ? JSON.stringify(post.content) : '';
  if (contentText === 'Object' || contentText === '[object Object]') {
    contentText = '';
  }

  return (
    <Card className="h-full overflow-hidden transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-xl group">
      <CardContent className="p-0 relative">
        <div className={cn("relative aspect-video", isLocked && "blur-sm")}> 
          {hasImage ? (
            isExternal ? (
              <img
                src={imageUrl!}
                alt={post.title}
                className="absolute inset-0 w-full h-full object-cover"
                data-ai-hint={imageHint}
              />
            ) : (
              <Image
                src={imageUrl!}
                alt={post.title}
                fill
                className="object-cover"
                data-ai-hint={imageHint}
                unoptimized
              />
            )
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted/30 via-muted to-muted-foreground/20" aria-hidden="true" />
          )}
        </div>
        
        {isLocked && requiredTier > 0 && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 text-center">
            <Lock className="w-8 h-8 text-primary-foreground" />
            <h3 className="font-bold text-lg text-primary-foreground mt-2">
              محتوای سطح {requiredTier}
            </h3>
            <p className="text-sm text-primary-foreground/80 mt-2">
              برای مشاهده این پست مشترک شوید.
            </p>
            <Link
              href={`/creators/${post.creator_id}/subscribe`}
              className={cn(buttonVariants({ variant: 'default' }), 'mt-3')}
            >
              مشترک شوید
            </Link>
          </div>
        )}

        <div className={cn("p-4", isLocked && "blur-sm")}> 
          <h3 className="font-bold text-lg truncate">{post.title}</h3>
          <p className="text-muted-foreground text-sm mt-1 truncate">
            {contentText}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
