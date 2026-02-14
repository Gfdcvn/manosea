import { create } from "zustand";
import { Server, Channel, Category, ServerMember, ServerRole } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface ServerState {
  servers: Server[];
  currentServer: Server | null;
  channels: Channel[];
  categories: Category[];
  members: ServerMember[];
  roles: ServerRole[];
  isLoading: boolean;

  setServers: (servers: Server[]) => void;
  setCurrentServer: (server: Server | null) => void;
  fetchServers: () => Promise<void>;
  fetchServerDetails: (serverId: string) => Promise<void>;
  createServer: (name: string, iconUrl?: string) => Promise<Server | null>;
  joinServer: (inviteCode: string) => Promise<boolean>;
  createChannel: (serverId: string, name: string, type: string, categoryId?: string) => Promise<void>;
  createCategory: (serverId: string, name: string) => Promise<void>;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  currentServer: null,
  channels: [],
  categories: [],
  members: [],
  roles: [],
  isLoading: false,

  setServers: (servers) => set({ servers }),
  setCurrentServer: (currentServer) => set({ currentServer }),

  fetchServers: async () => {
    const supabase = createClient();
    set({ isLoading: true });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberships } = await supabase
      .from("server_members")
      .select("server_id")
      .eq("user_id", user.id);

    if (memberships && memberships.length > 0) {
      const serverIds = memberships.map((m) => m.server_id);
      const { data: servers } = await supabase
        .from("servers")
        .select("*")
        .in("id", serverIds)
        .order("created_at");

      set({ servers: servers || [], isLoading: false });
    } else {
      set({ servers: [], isLoading: false });
    }
  },

  fetchServerDetails: async (serverId: string) => {
    const supabase = createClient();
    set({ isLoading: true });

    const [channelsRes, categoriesRes, membersRes, rolesRes] = await Promise.all([
      supabase.from("channels").select("*").eq("server_id", serverId).order("position"),
      supabase.from("categories").select("*").eq("server_id", serverId).order("position"),
      supabase.from("server_members").select("*, user:users(*)").eq("server_id", serverId),
      supabase.from("server_roles").select("*").eq("server_id", serverId).order("position"),
    ]);

    set({
      channels: channelsRes.data || [],
      categories: categoriesRes.data || [],
      members: (membersRes.data || []) as ServerMember[],
      roles: rolesRes.data || [],
      isLoading: false,
    });
  },

  createServer: async (name, iconUrl) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: server, error } = await supabase
      .from("servers")
      .insert({ name, icon_url: iconUrl || null, owner_id: user.id })
      .select()
      .single();

    if (error || !server) return null;

    // Create default channel
    await supabase.from("channels").insert({
      server_id: server.id,
      name: "general",
      type: "text",
      position: 0,
    });

    // Add owner as member
    await supabase.from("server_members").insert({
      server_id: server.id,
      user_id: user.id,
    });

    // Create default role
    await supabase.from("server_roles").insert({
      server_id: server.id,
      name: "@everyone",
      color: "#99aab5",
      permissions: 0,
      position: 0,
    });

    await get().fetchServers();
    return server;
  },

  joinServer: async (inviteCode) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: invite } = await supabase
      .from("server_invites")
      .select("*")
      .eq("code", inviteCode)
      .single();

    if (!invite) return false;

    const { error } = await supabase.from("server_members").insert({
      server_id: invite.server_id,
      user_id: user.id,
    });

    if (!error) {
      await supabase
        .from("server_invites")
        .update({ uses: invite.uses + 1 })
        .eq("id", invite.id);

      await get().fetchServers();
      return true;
    }
    return false;
  },

  createChannel: async (serverId, name, type, categoryId) => {
    const supabase = createClient();
    await supabase.from("channels").insert({
      server_id: serverId,
      name,
      type,
      category_id: categoryId || null,
      position: get().channels.length,
    });
    await get().fetchServerDetails(serverId);
  },

  createCategory: async (serverId, name) => {
    const supabase = createClient();
    await supabase.from("categories").insert({
      server_id: serverId,
      name,
      position: get().categories.length,
    });
    await get().fetchServerDetails(serverId);
  },
}));
