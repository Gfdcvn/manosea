"use client";

import { ServerSidebar } from "@/components/layout/server-sidebar";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useServerStore } from "@/stores/server-store";
import { useMessageStore } from "@/stores/message-store";
import { RealtimeProvider } from "@/components/realtime-provider";

export default function ChannelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const fetchServers = useServerStore((s) => s.fetchServers);
  const fetchDmChannels = useMessageStore((s) => s.fetchDmChannels);

  useEffect(() => {
    if (isInitialized && user) {
      fetchServers();
      fetchDmChannels();
    }
  }, [isInitialized, user, fetchServers, fetchDmChannels]);

  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-discord-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-discord-brand border-t-transparent animate-spin" />
          <p className="text-discord-brand text-lg font-semibold animate-pulse">Loading Ricord...</p>
        </div>
      </div>
    );
  }

  return (
    <RealtimeProvider>
      <div className="h-screen flex overflow-hidden">
        <ServerSidebar />
        <div className="flex-1 flex">{children}</div>
      </div>
    </RealtimeProvider>
  );
}
