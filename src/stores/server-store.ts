import { create } from "zustand";
import { Server, Channel, Category, ServerMember, ServerRole, ServerMemberRole, ServerBan, ServerMute, ServerSuspension, ServerMemberNote, ChannelVisibilityOverride, PERMISSIONS } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface ServerState {
  servers: Server[];
  currentServer: Server | null;
  channels: Channel[];
  categories: Category[];
  members: ServerMember[];
  roles: ServerRole[];
  memberRoles: ServerMemberRole[];
  serverBans: ServerBan[];
  serverMutes: ServerMute[];
  serverSuspensions: ServerSuspension[];
  memberNotes: ServerMemberNote[];
  channelOverrides: ChannelVisibilityOverride[];
  isLoading: boolean;

  setServers: (servers: Server[]) => void;
  setCurrentServer: (server: Server | null) => void;
  fetchServers: () => Promise<void>;
  fetchServerDetails: (serverId: string) => Promise<void>;
  createServer: (name: string, iconUrl?: string) => Promise<Server | null>;
  joinServer: (inviteCode: string) => Promise<boolean>;
  createChannel: (serverId: string, name: string, type: string, categoryId?: string) => Promise<void>;
  createCategory: (serverId: string, name: string) => Promise<void>;
  renameChannel: (channelId: string, newName: string, serverId: string) => Promise<void>;
  deleteChannel: (channelId: string, serverId: string) => Promise<void>;
  moveChannel: (channelId: string, categoryId: string | null, serverId: string) => Promise<void>;
  updateServer: (serverId: string, data: Partial<Server>) => Promise<void>;
  
  // Role management
  createRole: (serverId: string, data: { name: string; color: string; icon?: string | null; is_elevated?: boolean; permissions: number }) => Promise<void>;
  updateRole: (roleId: string, serverId: string, data: Partial<ServerRole>) => Promise<void>;
  deleteRole: (roleId: string, serverId: string) => Promise<void>;
  assignRole: (serverId: string, memberId: string, roleId: string) => Promise<void>;
  removeRole: (serverId: string, memberId: string, roleId: string) => Promise<void>;
  getMemberRoles: (memberId: string) => ServerRole[];
  getMemberPermissions: (memberId: string) => number;
  
  // Server moderation
  serverBanUser: (serverId: string, userId: string, reason: string) => Promise<void>;
  serverUnbanUser: (serverId: string, userId: string) => Promise<void>;
  serverMuteUser: (serverId: string, userId: string, reason: string, durationDays: number) => Promise<void>;
  serverUnmuteUser: (serverId: string, muteId: string) => Promise<void>;
  serverSuspendUser: (serverId: string, userId: string, reason: string, durationDays: number) => Promise<void>;
  serverUnsuspendUser: (serverId: string, suspensionId: string) => Promise<void>;
  addMemberNote: (serverId: string, userId: string, note: string) => Promise<void>;
  deleteMemberNote: (noteId: string, serverId: string) => Promise<void>;
  setChannelVisibility: (channelId: string, userId: string, hidden: boolean) => Promise<void>;
  removeChannelVisibility: (channelId: string, userId: string) => Promise<void>;
  fetchServerModeration: (serverId: string) => Promise<void>;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  currentServer: null,
  channels: [],
  categories: [],
  members: [],
  roles: [],
  memberRoles: [],
  serverBans: [],
  serverMutes: [],
  serverSuspensions: [],
  memberNotes: [],
  channelOverrides: [],
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

    const [channelsRes, categoriesRes, membersRes, rolesRes, memberRolesRes] = await Promise.all([
      supabase.from("channels").select("*").eq("server_id", serverId).order("position"),
      supabase.from("categories").select("*").eq("server_id", serverId).order("position"),
      supabase.from("server_members").select("*, user:users(*)").eq("server_id", serverId),
      supabase.from("server_roles").select("*").eq("server_id", serverId).order("position"),
      supabase.from("server_member_roles").select("*").eq("server_id", serverId),
    ]);

    set({
      channels: channelsRes.data || [],
      categories: categoriesRes.data || [],
      members: (membersRes.data || []) as ServerMember[],
      roles: rolesRes.data || [],
      memberRoles: (memberRolesRes.data || []) as ServerMemberRole[],
      isLoading: false,
    });
  },

  createServer: async (name, iconUrl) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if user is suspended or banned
    const { data: profile } = await supabase.from("users").select("is_suspended, is_banned").eq("id", user.id).single();
    if (profile?.is_suspended || profile?.is_banned) return null;

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
      permissions: PERMISSIONS.SEND_MESSAGES | PERMISSIONS.INVITE_PEOPLE,
      position: 0,
      icon: null,
      is_elevated: false,
    });

    await get().fetchServers();
    return server;
  },

  joinServer: async (inviteCode) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if user is suspended or banned
    const { data: profile } = await supabase.from("users").select("is_suspended, is_banned").eq("id", user.id).single();
    if (profile?.is_suspended || profile?.is_banned) return false;

    const { data: invite } = await supabase
      .from("server_invites")
      .select("*")
      .eq("code", inviteCode)
      .single();

    if (!invite) return false;

    // Check if user is server-banned
    const { data: ban } = await supabase
      .from("server_bans")
      .select("id")
      .eq("server_id", invite.server_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (ban) return false;

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

  renameChannel: async (channelId, newName, serverId) => {
    const supabase = createClient();
    await supabase.from("channels").update({ name: newName }).eq("id", channelId);
    await get().fetchServerDetails(serverId);
  },

  deleteChannel: async (channelId, serverId) => {
    const supabase = createClient();
    await supabase.from("channels").delete().eq("id", channelId);
    await get().fetchServerDetails(serverId);
  },

  moveChannel: async (channelId, categoryId, serverId) => {
    const supabase = createClient();
    await supabase.from("channels").update({ category_id: categoryId }).eq("id", channelId);
    await get().fetchServerDetails(serverId);
  },

  updateServer: async (serverId, data) => {
    const supabase = createClient();
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.banner_color !== undefined) updateData.banner_color = data.banner_color;
    if (data.tag !== undefined) updateData.tag = data.tag;
    if (data.icon_url !== undefined) updateData.icon_url = data.icon_url;
    if (data.is_discoverable !== undefined) updateData.is_discoverable = data.is_discoverable;
    await supabase.from("servers").update(updateData).eq("id", serverId);
    await get().fetchServers();
    // Update currentServer in local state
    const server = get().servers.find((s) => s.id === serverId);
    if (server) set({ currentServer: server });
  },

  // Role management
  createRole: async (serverId, data) => {
    const supabase = createClient();
    const maxPos = Math.max(...get().roles.map((r) => r.position), 0);
    await supabase.from("server_roles").insert({
      server_id: serverId,
      name: data.name,
      color: data.color,
      icon: data.icon || null,
      is_elevated: data.is_elevated || false,
      permissions: data.permissions,
      position: maxPos + 1,
    });
    await get().fetchServerDetails(serverId);
  },

  updateRole: async (roleId, serverId, data) => {
    const supabase = createClient();
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.is_elevated !== undefined) updateData.is_elevated = data.is_elevated;
    if (data.permissions !== undefined) updateData.permissions = data.permissions;
    if (data.position !== undefined) updateData.position = data.position;
    await supabase.from("server_roles").update(updateData).eq("id", roleId);
    await get().fetchServerDetails(serverId);
  },

  deleteRole: async (roleId, serverId) => {
    const supabase = createClient();
    // Remove all member role assignments for this role
    await supabase.from("server_member_roles").delete().eq("role_id", roleId);
    await supabase.from("server_roles").delete().eq("id", roleId);
    await get().fetchServerDetails(serverId);
  },

  assignRole: async (serverId, memberId, roleId) => {
    const supabase = createClient();
    await supabase.from("server_member_roles").insert({
      server_id: serverId,
      member_id: memberId,
      role_id: roleId,
    });
    await get().fetchServerDetails(serverId);
  },

  removeRole: async (serverId, memberId, roleId) => {
    const supabase = createClient();
    await supabase.from("server_member_roles").delete().eq("member_id", memberId).eq("role_id", roleId);
    await get().fetchServerDetails(serverId);
  },

  getMemberRoles: (memberId) => {
    const state = get();
    const roleIds = state.memberRoles
      .filter((mr) => mr.member_id === memberId)
      .map((mr) => mr.role_id);
    return state.roles.filter((r) => roleIds.includes(r.id));
  },

  getMemberPermissions: (memberId) => {
    const roles = get().getMemberRoles(memberId);
    let perms = 0;
    for (const role of roles) {
      perms |= role.permissions;
    }
    // Also include @everyone role permissions
    const everyoneRole = get().roles.find((r) => r.name === "@everyone");
    if (everyoneRole) perms |= everyoneRole.permissions;
    return perms;
  },

  // Server moderation
  serverBanUser: async (serverId, userId, reason) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Insert ban record
    await supabase.from("server_bans").insert({
      server_id: serverId,
      user_id: userId,
      reason,
      banned_by: user.id,
    });
    // Remove from server members
    await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", userId);
    await get().fetchServerDetails(serverId);
  },

  serverUnbanUser: async (serverId, userId) => {
    const supabase = createClient();
    await supabase.from("server_bans").delete().eq("server_id", serverId).eq("user_id", userId);
    await get().fetchServerModeration(serverId);
  },

  serverMuteUser: async (serverId, userId, reason, durationDays) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("server_mutes").insert({
      server_id: serverId,
      user_id: userId,
      reason,
      duration_days: durationDays,
      muted_by: user.id,
      expires_at: expiresAt,
    });
    await get().fetchServerModeration(serverId);
  },

  serverUnmuteUser: async (serverId, muteId) => {
    const supabase = createClient();
    await supabase.from("server_mutes").delete().eq("id", muteId);
    await get().fetchServerModeration(serverId);
  },

  serverSuspendUser: async (serverId, userId, reason, durationDays) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("server_suspensions").insert({
      server_id: serverId,
      user_id: userId,
      reason,
      duration_days: durationDays,
      suspended_by: user.id,
      expires_at: expiresAt,
    });
    await get().fetchServerDetails(serverId);
  },

  serverUnsuspendUser: async (serverId, suspensionId) => {
    const supabase = createClient();
    await supabase.from("server_suspensions").delete().eq("id", suspensionId);
    await get().fetchServerModeration(serverId);
  },

  addMemberNote: async (serverId, userId, note) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("server_member_notes").insert({
      server_id: serverId,
      user_id: userId,
      note,
      created_by: user.id,
    });
    await get().fetchServerModeration(serverId);
  },

  deleteMemberNote: async (noteId, serverId) => {
    const supabase = createClient();
    await supabase.from("server_member_notes").delete().eq("id", noteId);
    await get().fetchServerModeration(serverId);
  },

  setChannelVisibility: async (channelId, userId, hidden) => {
    const supabase = createClient();
    await supabase.from("channel_visibility_overrides").upsert({
      channel_id: channelId,
      user_id: userId,
      hidden,
    }, { onConflict: "channel_id,user_id" });
    const serverId = get().currentServer?.id;
    if (serverId) await get().fetchServerModeration(serverId);
  },

  removeChannelVisibility: async (channelId, userId) => {
    const supabase = createClient();
    await supabase.from("channel_visibility_overrides").delete().eq("channel_id", channelId).eq("user_id", userId);
    const serverId = get().currentServer?.id;
    if (serverId) await get().fetchServerModeration(serverId);
  },

  fetchServerModeration: async (serverId) => {
    const supabase = createClient();
    const [bansRes, mutesRes, suspensionsRes, notesRes, overridesRes] = await Promise.all([
      supabase.from("server_bans").select("*").eq("server_id", serverId),
      supabase.from("server_mutes").select("*").eq("server_id", serverId),
      supabase.from("server_suspensions").select("*").eq("server_id", serverId),
      supabase.from("server_member_notes").select("*").eq("server_id", serverId),
      supabase.from("channel_visibility_overrides").select("*").in("channel_id", get().channels.map((c) => c.id)),
    ]);
    set({
      serverBans: (bansRes.data || []) as ServerBan[],
      serverMutes: (mutesRes.data || []) as ServerMute[],
      serverSuspensions: (suspensionsRes.data || []) as ServerSuspension[],
      memberNotes: (notesRes.data || []) as ServerMemberNote[],
      channelOverrides: (overridesRes.data || []) as ChannelVisibilityOverride[],
    });
  },
}));
