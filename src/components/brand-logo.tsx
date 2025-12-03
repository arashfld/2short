import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  size?: number;
  alt?: string;
};

export function BrandLogo({ className, size = 40, alt = "FarsiFanConnect" }: BrandLogoProps) {
  return (
    <Image
      src="/jJEmqM01.svg"
      alt={alt}
      width={size}
      height={size}
      priority
      className={cn(className)}
    />
  );
}