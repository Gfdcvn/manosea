import { create } from "zustand";

interface NotificationState {
  // Track mentions per server: { serverId: Set<channelId> }
  serverMentions: Record<string, Set<string>>;
  // Muted servers and channels (from user settings)
  mutedServers: Set<string>;
  mutedChannels: Set<string>;

  addMention: (serverId: string, channelId: string) => void;
  clearServerMentions: (serverId: string) => void;
  clearChannelMention: (serverId: string, channelId: string) => void;
  hasServerMention: (serverId: string) => boolean;
  hasChannelMention: (serverId: string, channelId: string) => boolean;
  getServerMentionCount: (serverId: string) => number;
  setMutedServers: (ids: string[]) => void;
  setMutedChannels: (ids: string[]) => void;
  toggleMuteServer: (serverId: string) => void;
  toggleMuteChannel: (channelId: string) => void;
  isServerMuted: (serverId: string) => boolean;
  isChannelMuted: (channelId: string) => boolean;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  serverMentions: {},
  mutedServers: new Set<string>(),
  mutedChannels: new Set<string>(),

  addMention: (serverId, channelId) =>
    set((state) => {
      // Don't add mention if server or channel is muted
      if (state.mutedServers.has(serverId) || state.mutedChannels.has(channelId)) return state;
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

  setMutedServers: (ids) => set({ mutedServers: new Set(ids) }),
  setMutedChannels: (ids) => set({ mutedChannels: new Set(ids) }),

  toggleMuteServer: (serverId) =>
    set((state) => {
      const next = new Set(state.mutedServers);
      if (next.has(serverId)) next.delete(serverId);
      else next.add(serverId);
      return { mutedServers: next };
    }),

  toggleMuteChannel: (channelId) =>
    set((state) => {
      const next = new Set(state.mutedChannels);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return { mutedChannels: next };
    }),

  isServerMuted: (serverId) => get().mutedServers.has(serverId),
  isChannelMuted: (channelId) => get().mutedChannels.has(channelId),
}));
