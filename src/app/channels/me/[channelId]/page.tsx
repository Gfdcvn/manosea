"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMessageStore } from "@/stores/message-store";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { ChatArea } from "@/components/chat/chat-area";
import { User } from "@/types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function DmChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const user = useAuthStore((s) => s.user);
  const { fetchMessages, setCurrentChannelId, setCurrentDmChannel, markDmAsRead } = useMessageStore();
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId || !user) return;

    // Mark as read when opening
    markDmAsRead(channelId);

    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: dm } = await supabase
        .from("dm_channels")
        .select("*, user1:users!dm_channels_user1_id_fkey(*), user2:users!dm_channels_user2_id_fkey(*)")
        .eq("id", channelId)
        .single();

      if (dm) {
        setCurrentDmChannel(dm);
        const other = dm.user1_id === user.id ? dm.user2 : dm.user1;
        setOtherUser(other);
      }

      setCurrentChannelId(channelId);
      await fetchMessages(channelId, true);
      setLoading(false);
    };

    load();

    return () => {
      setCurrentChannelId(null);
      setCurrentDmChannel(null);
    };
  }, [channelId, user, fetchMessages, setCurrentChannelId, setCurrentDmChannel, markDmAsRead]);

  if (loading) {
    return <LoadingSpinner fullPage size="lg" label="Loading conversation..." />;
  }

  return (
    <ChatArea
      channelName={otherUser?.display_name || "Direct Message"}
      channelId={channelId}
      isDm
      otherUser={otherUser}
    />
  );
}
