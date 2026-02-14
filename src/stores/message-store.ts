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

  setMessages: (messages: Message[]) => void;
  setCurrentChannelId: (id: string | null) => void;
  setCurrentDmChannel: (channel: DMChannel | null) => void;
  addMessage: (message: Message) => void;

  fetchMessages: (channelId: string, isDm?: boolean) => Promise<void>;
  fetchMoreMessages: (channelId: string, isDm?: boolean) => Promise<void>;
  sendMessage: (content: string, channelId: string, isDm?: boolean) => Promise<Message | null>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;

  fetchDmChannels: () => Promise<void>;
  createDmChannel: (userId: string) => Promise<DMChannel | null>;

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

  setMessages: (messages) => set({ messages }),
  setCurrentChannelId: (currentChannelId) => set({ currentChannelId }),
  setCurrentDmChannel: (currentDmChannel) => set({ currentDmChannel }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

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

    set({ dmChannels: data || [] });
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

    if (existing) return existing;

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
