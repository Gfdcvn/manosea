"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useMessageStore } from "@/stores/message-store";
import { useServerStore } from "@/stores/server-store";
import { ChatArea } from "@/components/chat/chat-area";
import { VoiceChannelView } from "@/components/chat/voice-channel";
import { MemberSidebar } from "@/components/layout/member-sidebar";
import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const channels = useServerStore((s) => s.channels);
  const { fetchMessages, setCurrentChannelId } = useMessageStore();
  const [showMembers] = useState(true);

  const channel = channels.find((c) => c.id === channelId);

  useEffect(() => {
    if (channelId) {
      setCurrentChannelId(channelId);
      fetchMessages(channelId);
    }

    return () => setCurrentChannelId(null);
  }, [channelId, fetchMessages, setCurrentChannelId]);

  if (!channel && channels.length === 0) {
    return <LoadingSpinner fullPage size="lg" label="Loading channel..." />;
  }

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-discord-chat">
        <p className="text-gray-400">Channel not found</p>
      </div>
    );
  }

  if (channel.type === "voice") {
    return (
      <VoiceChannelView
        channelId={channelId}
        channelName={channel.name}
      />
    );
  }

  return (
    <div className="flex flex-1">
      <ChatArea
        channelName={channel.name}
        channelId={channelId}
      />
      {showMembers && <MemberSidebar />}
    </div>
  );
}
