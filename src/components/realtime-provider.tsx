"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useMessageStore } from "@/stores/message-store";
import { useNotificationStore } from "@/stores/notification-store";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const currentChannelId = useMessageStore((s) => s.currentChannelId);
  const addMessage = useMessageStore((s) => s.addMessage);
  const markDmAsUnread = useMessageStore((s) => s.markDmAsUnread);
  const bumpDmChannel = useMessageStore((s) => s.bumpDmChannel);
  const fetchDmChannels = useMessageStore((s) => s.fetchDmChannels);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    // Subscribe to new messages
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new as { id: string; dm_channel_id?: string; channel_id?: string; author_id?: string; content?: string };
          // Fetch full message with author
          const { data } = await supabase
            .from("messages")
            .select("*, author:users(*), attachments(*)")
            .eq("id", newMessage.id)
            .single();

          if (data) {
            const targetChannel = data.channel_id || data.dm_channel_id;
            if (targetChannel === currentChannelId) {
              addMessage(data);
            }

            // Handle DM unread + bump
            if (data.dm_channel_id && data.author_id !== user.id) {
              markDmAsUnread(data.dm_channel_id);
              bumpDmChannel(data.dm_channel_id);

              // Also track DM mentions for red badge
              if (data.content) {
                const username = useAuthStore.getState().user?.username;
                if (
                  data.content.includes("@everyone") ||
                  data.content.includes("@here") ||
                  (username && data.content.includes(`@${username}`))
                ) {
                  useNotificationStore.getState().addMention("dm", data.dm_channel_id);
                }
              }
            }

            // Handle server mention notifications
            if (data.channel_id && data.author_id !== user.id && data.content) {
              const currentUser = useAuthStore.getState().user;
              const username = currentUser?.username;
              const hasMention =
                data.content.includes("@everyone") ||
                data.content.includes("@here") ||
                (username && data.content.includes(`@${username}`));

              if (hasMention) {
                // Find which server this channel belongs to
                const { data: channelData } = await supabase
                  .from("channels")
                  .select("server_id")
                  .eq("id", data.channel_id)
                  .single();

                if (channelData) {
                  useNotificationStore.getState().addMention(channelData.server_id, data.channel_id);
                }
              }
            }
          }
        }
      )
      .subscribe();

    // Subscribe to user status changes
    const statusChannel = supabase
      .channel("user-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=neq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; status?: string; display_name?: string; avatar_url?: string | null };
          // Update members in server store
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { useServerStore } = require("@/stores/server-store");
          const serverState = useServerStore.getState();
          const updatedMembers = serverState.members.map((m: { user?: { id: string } }) => {
            if (m.user && m.user.id === updated.id) {
              return { ...m, user: { ...m.user, ...updated } };
            }
            return m;
          });
          useServerStore.setState({ members: updatedMembers });

          // Update DM channels in message store
          const msgState = useMessageStore.getState();
          const updatedDmChannels = msgState.dmChannels.map((dm) => {
            if (dm.user1 && dm.user1.id === updated.id) {
              return { ...dm, user1: { ...dm.user1, ...updated } } as typeof dm;
            }
            if (dm.user2 && dm.user2.id === updated.id) {
              return { ...dm, user2: { ...dm.user2, ...updated } } as typeof dm;
            }
            return dm;
          });
          useMessageStore.setState({ dmChannels: updatedDmChannels });
        }
      )
      .subscribe();

    // Subscribe to punishment changes
    const punishmentChannel = supabase
      .channel("punishments-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_punishments",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Trigger punishment popup check
          useAuthStore.getState().initialize();
        }
      )
      .subscribe();

    // Subscribe to new DM channels (so new DMs appear without refresh)
    const dmChannelSub = supabase
      .channel("dm-channels-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_channels",
        },
        (payload) => {
          const newDm = payload.new as { user1_id?: string; user2_id?: string };
          // Only refresh if this DM involves the current user
          if (newDm.user1_id === user.id || newDm.user2_id === user.id) {
            fetchDmChannels();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(punishmentChannel);
      supabase.removeChannel(dmChannelSub);
    };
  }, [user, currentChannelId, addMessage, markDmAsUnread, bumpDmChannel, fetchDmChannels]);

  return <>{children}</>;
}
