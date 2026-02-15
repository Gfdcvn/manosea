"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Clock } from "lucide-react";
import { Suspense } from "react";

function ServerSuspendedContent() {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const initialize = useAuthStore((s) => s.initialize);
  const router = useRouter();
  const searchParams = useSearchParams();

  const serverId = searchParams.get("server");
  const [serverName, setServerName] = useState<string | null>(null);
  const [suspenderName, setSuspenderName] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/auth");
      return;
    }
    if (!serverId || !user) return;

    const supabase = createClient();

    // Fetch server name
    supabase
      .from("servers")
      .select("name")
      .eq("id", serverId)
      .single()
      .then(({ data }) => {
        if (data) setServerName(data.name);
      });

    // Fetch suspension details
    supabase
      .from("server_suspensions")
      .select("*")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(async ({ data }) => {
        if (data) {
          setReason(data.reason);
          setDuration(data.duration_days);
          setExpiresAt(data.expires_at);

          // Fetch suspender name
          const { data: suspender } = await supabase
            .from("users")
            .select("display_name, username")
            .eq("id", data.suspended_by)
            .single();
          if (suspender) {
            setSuspenderName(suspender.display_name || suspender.username);
          }
        } else {
          // No active suspension, redirect back
          router.replace("/channels/me");
        }
      });
  }, [isInitialized, user, serverId, router]);

  if (!isInitialized || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-discord-dark">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-b from-orange-950/40 to-discord-dark">
      <div className="max-w-lg w-full mx-4 text-center">
        <div className="bg-discord-darker rounded-2xl border border-orange-500/20 p-10 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Clock className="w-10 h-10 text-orange-500" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">Server Suspended</h1>

          <p className="text-gray-400 mb-6">
            You have been suspended from{" "}
            <span className="text-white font-semibold">{serverName || "this server"}</span>
          </p>

          {reason && (
            <div className="bg-discord-dark rounded-lg p-4 mb-4 text-left">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Reason</p>
              <p className="text-sm text-gray-300">{reason}</p>
            </div>
          )}

          {duration && (
            <div className="bg-discord-dark rounded-lg p-4 mb-4 text-left">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Duration</p>
              <p className="text-sm text-gray-300">{duration} day{duration !== 1 ? "s" : ""}</p>
            </div>
          )}

          {expiresAt && (
            <div className="bg-discord-dark rounded-lg p-4 mb-4 text-left">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Expires</p>
              <p className="text-sm text-gray-300">{new Date(expiresAt).toLocaleString()}</p>
            </div>
          )}

          {suspenderName && (
            <div className="bg-discord-dark rounded-lg p-4 mb-6 text-left">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Suspended By</p>
              <p className="text-sm text-gray-300">{suspenderName}</p>
            </div>
          )}

          <button
            onClick={() => router.push("/channels/me")}
            className="px-6 py-2.5 bg-discord-brand hover:bg-discord-brand/80 text-white rounded-lg font-medium transition-colors"
          >
            Back to Direct Messages
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ServerSuspendedPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-discord-dark">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
      </div>
    }>
      <ServerSuspendedContent />
    </Suspense>
  );
}
