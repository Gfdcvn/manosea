"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useMessageStore } from "@/stores/message-store";
import { useServerStore } from "@/stores/server-store";
import { ChatArea } from "@/components/chat/chat-area";
import { MemberSidebar } from "@/components/layout/member-sidebar";
import { useState } from "react";

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

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-discord-chat">
        <p className="text-gray-400">Channel not found</p>
      </div>
    );
  }

  if (channel.type === "voice") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-discord-chat">
        <h2 className="text-2xl font-bold text-white mb-4">{channel.name}</h2>
        <p className="text-gray-400 mb-6">Voice Channel</p>
        <button className="bg-discord-green text-white px-6 py-3 rounded-full font-medium hover:bg-green-600 transition-colors">
          Join Voice
        </button>
      </div>
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
