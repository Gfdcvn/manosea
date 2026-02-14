import { create } from "zustand";

interface NotificationState {
  // Track mentions per server: { serverId: Set<channelId> }
  serverMentions: Record<string, Set<string>>;

  addMention: (serverId: string, channelId: string) => void;
  clearServerMentions: (serverId: string) => void;
  clearChannelMention: (serverId: string, channelId: string) => void;
  hasServerMention: (serverId: string) => boolean;
  hasChannelMention: (serverId: string, channelId: string) => boolean;
  getServerMentionCount: (serverId: string) => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  serverMentions: {},

  addMention: (serverId, channelId) =>
    set((state) => {
      const current = state.serverMentions[serverId] || new Set<string>();
      const next = new Set(current);
      next.add(channelId);
      return {
        serverMentions: { ...state.serverMentions, [serverId]: next },
      };
    }),

  clearServerMentions: (serverId) =>
    set((state) => {
      const next = { ...state.serverMentions };
      delete next[serverId];
      return { serverMentions: next };
    }),

  clearChannelMention: (serverId, channelId) =>
    set((state) => {
      const current = state.serverMentions[serverId];
      if (!current) return state;
      const next = new Set(current);
      next.delete(channelId);
      if (next.size === 0) {
        const updated = { ...state.serverMentions };
        delete updated[serverId];
        return { serverMentions: updated };
      }
      return {
        serverMentions: { ...state.serverMentions, [serverId]: next },
      };
    }),

  hasServerMention: (serverId) => {
    const mentions = get().serverMentions[serverId];
    return !!mentions && mentions.size > 0;
  },

  hasChannelMention: (serverId, channelId) => {
    const mentions = get().serverMentions[serverId];
    return !!mentions && mentions.has(channelId);
  },

  getServerMentionCount: (serverId) => {
    const mentions = get().serverMentions[serverId];
    return mentions ? mentions.size : 0;
  },
}));
