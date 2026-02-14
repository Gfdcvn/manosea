"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldBan } from "lucide-react";

export default function BannedPage() {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const initialize = useAuthStore((s) => s.initialize);
  const router = useRouter();
  const [adminName, setAdminName] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // If user is not banned, redirect back to app
  useEffect(() => {
    if (isInitialized && user && !user.is_banned) {
      router.replace("/channels/me");
    }
    if (isInitialized && !user) {
      router.replace("/auth");
    }
  }, [isInitialized, user, router]);

  // Fetch admin who banned the user
  useEffect(() => {
    if (!user?.banned_by) return;
    const supabase = createClient();
    supabase
      .from("users")
      .select("display_name, username")
      .eq("id", user.banned_by)
      .single()
      .then(({ data }) => {
        if (data) {
          setAdminName(data.display_name || data.username);
        }
      });
  }, [user?.banned_by]);

  if (!isInitialized || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-discord-dark">
        <div className="w-12 h-12 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-b from-red-950/40 to-discord-dark">
      <div className="max-w-lg w-full mx-4 text-center">
        <div className="bg-discord-darker rounded-2xl border border-red-500/20 p-10 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
              <ShieldBan className="w-10 h-10 text-red-500" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-red-400 mb-4">
            {user.display_name || user.username} is Banned
          </h1>

          {user.ban_reason && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-400 uppercase font-semibold mb-1">Reason</p>
              <p className="text-red-300 text-base">{user.ban_reason}</p>
            </div>
          )}

          {adminName && (
            <p className="text-gray-400 text-sm mb-6">
              You were banned by <span className="text-white font-semibold">{adminName}</span>.
            </p>
          )}

          <div className="h-px bg-gray-700 my-6" />

          <p className="text-gray-400 text-sm leading-relaxed">
            You may no longer access the app until this ban is lifted, if ever.
          </p>
        </div>
      </div>
    </div>
  );
}
