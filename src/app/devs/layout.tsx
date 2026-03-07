"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

export default function DevsLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const initialize = useAuthStore((s) => s.initialize);
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) initialize();
  }, [isInitialized, initialize]);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/auth/login");
    }
    if (isInitialized && user?.is_banned) {
      router.replace("/banned");
    }
  }, [isInitialized, user, router]);

  if (!isInitialized || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-discord-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-discord-brand border-t-transparent animate-spin" />
          <p className="text-discord-brand text-lg font-semibold animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
