"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useServerStore } from "@/stores/server-store";

export default function ServerPage() {
  const router = useRouter();
  const params = useParams();
  const serverId = params.serverId as string;
  const channels = useServerStore((s) => s.channels);

  useEffect(() => {
    // Auto-redirect to first text channel
    const textChannel = channels.find((c) => c.type === "text");
    if (textChannel) {
      router.replace(`/channels/${serverId}/${textChannel.id}`);
    }
  }, [channels, serverId, router]);

  return (
    <div className="flex-1 flex items-center justify-center bg-discord-chat">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome!</h2>
        <p className="text-gray-400">Select a channel to start chatting</p>
      </div>
    </div>
  );
}
