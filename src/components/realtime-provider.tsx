"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useMessageStore } from "@/stores/message-store";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const currentChannelId = useMessageStore((s) => s.currentChannelId);
  const addMessage = useMessageStore((s) => s.addMessage);

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
          const newMessage = payload.new as { id: string };
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
        () => {
          // Status updates handled by component subscriptions
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

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(punishmentChannel);
    };
  }, [user, currentChannelId, addMessage]);

  return <>{children}</>;
}
