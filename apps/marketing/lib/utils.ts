import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const APP_URLS = {
  signup:
    process.env.NEXT_PUBLIC_SIGNUP_URL ?? "https://app.1commerce.online/signup",
  login:
    process.env.NEXT_PUBLIC_LOGIN_URL ?? "https://app.1commerce.online/login",
  app: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1commerce.online",
  demoVideo:
    process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ??
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
};
