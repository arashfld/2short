import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Money helpers (Tomans)
// In this app, `price_cents` stores toman amounts (misnamed).
// Use these helpers for consistent display and parsing.
export function formatTomans(value: number | null | undefined, withSuffix = false): string {
  if (value == null || !Number.isFinite(value)) return "";
  const formatted = Number(value).toLocaleString('fa-IR');
  return withSuffix ? `${formatted} تومان` : formatted;
}

export function parseTomansInput(input: string): number | null {
  const digits = (input ?? "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  const num = Number.parseInt(digits, 10);
  return Number.isFinite(num) ? num : null;
}
