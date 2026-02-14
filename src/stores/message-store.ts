import { create } from "zustand";
import { Message, DMChannel, TypingIndicator } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface MessageState {
  messages: Message[];
  dmChannels: DMChannel[];
  currentDmChannel: DMChannel | null;
  currentChannelId: string | null;
  typingUsers: TypingIndicator[];
  isLoading: boolean;
  hasMore: boolean;
  unreadDmChannels: Set<string>;

  setMessages: (messages: Message[]) => void;
  setCurrentChannelId: (id: string | null) => void;
  setCurrentDmChannel: (channel: DMChannel | null) => void;
  addMessage: (message: Message) => void;
  markDmAsUnread: (dmChannelId: string) => void;
  markDmAsRead: (dmChannelId: string) => void;
  bumpDmChannel: (dmChannelId: string) => void;

  fetchMessages: (channelId: string, isDm?: boolean) => Promise<void>;
  fetchMoreMessages: (channelId: string, isDm?: boolean) => Promise<void>;
  sendMessage: (content: string, channelId: string, isDm?: boolean) => Promise<Message | null>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;

  fetchDmChannels: () => Promise<void>;
  createDmChannel: (userId: string) => Promise<DMChannel | null>;
  deleteDmChannel: (dmChannelId: string) => Promise<void>;

  sendTyping: (channelId: string) => void;
  addTypingUser: (indicator: TypingIndicator) => void;
  removeTypingUser: (userId: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  dmChannels: [],
  currentDmChannel: null,
  currentChannelId: null,
  typingUsers: [],
  isLoading: false,
  hasMore: true,
  unreadDmChannels: new Set<string>(),

  setMessages: (messages) => set({ messages }),
  setCurrentChannelId: (currentChannelId) => set({ currentChannelId }),
  setCurrentDmChannel: (currentDmChannel) => set({ currentDmChannel }),
  markDmAsUnread: (dmChannelId) =>
    set((state) => {
      // Only mark as unread if we're not currently viewing this DM
      if (state.currentChannelId === dmChannelId) return state;
      const next = new Set(state.unreadDmChannels);
      next.add(dmChannelId);
      return { unreadDmChannels: next };
    }),
  markDmAsRead: (dmChannelId) =>
    set((state) => {
      const next = new Set(state.unreadDmChannels);
      next.delete(dmChannelId);
      return { unreadDmChannels: next };
    }),
  bumpDmChannel: (dmChannelId) =>
    set((state) => {
      const idx = state.dmChannels.findIndex((dm) => dm.id === dmChannelId);
      if (idx <= 0) return state; // already at top or not found
      const channels = [...state.dmChannels];
      const [bumped] = channels.splice(idx, 1);
      channels.unshift(bumped);
      return { dmChannels: channels };
    }),
  addMessage: (message) =>
    set((state) => {
      // Deduplicate — skip if message already exists
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    }),

  fetchMessages: async (channelId, isDm = false) => {
    const supabase = createClient();
    set({ isLoading: true, messages: [], hasMore: true });

    const column = isDm ? "dm_channel_id" : "channel_id";
    const { data } = await supabase
      .from("messages")
      .select("*, author:users(*), attachments(*)")
      .eq(column, channelId)
      .order("created_at", { ascending: false })
      .limit(50);

    set({
      messages: (data || []).reverse(),
      isLoading: false,
      hasMore: (data?.length || 0) >= 50,
    });
  },

  fetchMoreMessages: async (channelId, isDm = false) => {
    const supabase = createClient();
    const { messages } = get();
    if (messages.length === 0) return;

    const column = isDm ? "dm_channel_id" : "channel_id";
    const oldestMessage = messages[0];

    const { data } = await supabase
      .from("messages")
      .select("*, author:users(*), attachments(*)")
      .eq(column, channelId)
      .lt("created_at", oldestMessage.created_at)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      set({
        messages: [...data.reverse(), ...messages],
        hasMore: data.length >= 50,
      });
    } else {
      set({ hasMore: false });
    }
  },

  sendMessage: async (content, channelId, isDm = false) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const messageData: Record<string, unknown> = {
      content,
      author_id: user.id,
    };

    if (isDm) {
      messageData.dm_channel_id = channelId;
    } else {
      messageData.channel_id = channelId;
    }

    const { data, error } = await supabase
      .from("messages")
      .insert(messageData)
      .select("*, author:users(*)")
      .single();

    if (error) return null;

    // Optimistically add to local state so the message appears instantly
    if (data) {
      const currentChannel = get().currentChannelId;
      const targetChannel = data.channel_id || data.dm_channel_id;
      if (targetChannel === currentChannel) {
        set((state) => {
          if (state.messages.some((m) => m.id === data.id)) return state;
          return { messages: [...state.messages, data] };
        });
      }
    }

    return data;
  },

  editMessage: async (messageId, content) => {
    const supabase = createClient();
    await supabase
      .from("messages")
      .update({ content, is_edited: true, updated_at: new Date().toISOString() })
      .eq("id", messageId);

    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, content, is_edited: true } : m
      ),
    }));
  },

  deleteMessage: async (messageId) => {
    const supabase = createClient();
    await supabase.from("messages").delete().eq("id", messageId);
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    }));
  },

  fetchDmChannels: async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("dm_channels")
      .select("*, user1:users!dm_channels_user1_id_fkey(*), user2:users!dm_channels_user2_id_fkey(*)")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!data) { set({ dmChannels: [] }); return; }

    // Fetch last message for each DM channel to sort by activity
    const channelIds = data.map((dm) => dm.id);
    if (channelIds.length > 0) {
      // Get the latest message for each DM channel
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("dm_channel_id, created_at")
        .in("dm_channel_id", channelIds)
        .order("created_at", { ascending: false });

      // Build map of dm_channel_id -> latest message timestamp
      const lastMessageMap: Record<string, string> = {};
      (lastMessages || []).forEach((msg) => {
        if (msg.dm_channel_id && !lastMessageMap[msg.dm_channel_id]) {
          lastMessageMap[msg.dm_channel_id] = msg.created_at;
        }
      });

      // Sort: DMs with recent messages first, then by channel creation date
      data.sort((a, b) => {
        const aTime = lastMessageMap[a.id] || a.created_at;
        const bTime = lastMessageMap[b.id] || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    }

    set({ dmChannels: data });
  },

  createDmChannel: async (userId) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if channel already exists
    const { data: existing } = await supabase
      .from("dm_channels")
      .select("*")
      .or(
        `and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`
      )
      .single();

    if (existing) {
      // Refresh DM channels to ensure sidebar shows it
      await get().fetchDmChannels();
      return existing;
    }

    const { data: channel } = await supabase
      .from("dm_channels")
      .insert({ user1_id: user.id, user2_id: userId })
      .select()
      .single();

    if (channel) {
      await get().fetchDmChannels();
    }
    return channel;
  },

  deleteDmChannel: async (dmChannelId) => {
    const supabase = createClient();
    // Delete all messages in this DM channel first
    await supabase.from("messages").delete().eq("dm_channel_id", dmChannelId);
    // Then delete the channel
    await supabase.from("dm_channels").delete().eq("id", dmChannelId);
    // Update local state
    set((state) => ({
      dmChannels: state.dmChannels.filter((dm) => dm.id !== dmChannelId),
      currentDmChannel: state.currentDmChannel?.id === dmChannelId ? null : state.currentDmChannel,
    }));
  },

  sendTyping: (channelId) => {
    const supabase = createClient();
    supabase.channel(`typing:${channelId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { channelId },
    });
  },

  addTypingUser: (indicator) =>
    set((state) => {
      const exists = state.typingUsers.find((t) => t.user_id === indicator.user_id);
      if (exists) return state;
      return { typingUsers: [...state.typingUsers, indicator] };
    }),

  removeTypingUser: (userId) =>
    set((state) => ({
      typingUsers: state.typingUsers.filter((t) => t.user_id !== userId),
    })),
}));
