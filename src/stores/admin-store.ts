import { create } from "zustand";
import { Badge, Punishment, User } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface AdminState {
  users: User[];
  badges: Badge[];
  punishments: Punishment[];
  isLoading: boolean;

  fetchAllUsers: () => Promise<void>;
  fetchAllBadges: () => Promise<void>;
  fetchUserPunishments: (userId: string) => Promise<void>;

  updateUserRole: (userId: string, role: string) => Promise<void>;
  issuePunishment: (data: {
    user_id: string;
    type: string;
    reason: string;
    severity?: number;
    duration_days?: number;
  }) => Promise<void>;

  createBadge: (data: { name: string; description?: string; icon?: string; icon_url?: string; type: string; affects_standing?: boolean; standing_override?: number }) => Promise<void>;
  deleteBadge: (badgeId: string) => Promise<void>;
  assignBadgeToUser: (userId: string, badgeId: string) => Promise<void>;
  removeBadgeFromUser: (userId: string, badgeId: string) => Promise<void>;
  assignBadgeToServer: (serverId: string, badgeId: string) => Promise<void>;
  removeBadgeFromServer: (serverId: string, badgeId: string) => Promise<void>;

  createBot: (data: { username: string; display_name?: string; bio?: string; avatar_url?: string; is_messagable: boolean }) => Promise<void>;
  deleteBot: (botId: string) => Promise<void>;
  updateBot: (botId: string, data: Partial<User>) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  users: [],
  badges: [],
  punishments: [],
  isLoading: false,

  fetchAllUsers: async () => {
    const supabase = createClient();
    set({ isLoading: true });
    const { data } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    set({ users: data || [], isLoading: false });
  },

  fetchAllBadges: async () => {
    const supabase = createClient();
    const { data } = await supabase.from("badges").select("*").order("created_at");
    set({ badges: data || [] });
  },

  fetchUserPunishments: async (userId) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_punishments")
      .select("*, issuer:users!user_punishments_issued_by_fkey(*)")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false });
    set({ punishments: data || [] });
  },

  updateUserRole: async (userId, role) => {
    const supabase = createClient();
    await supabase.from("users").update({ role }).eq("id", userId);
    await get().fetchAllUsers();
  },

  issuePunishment: async (data) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const expiresAt = data.duration_days
      ? new Date(Date.now() + data.duration_days * 86400000).toISOString()
      : null;

    const becomesPastAt = expiresAt;

    await supabase.from("user_punishments").insert({
      user_id: data.user_id,
      type: data.type,
      reason: data.reason,
      severity: data.severity || null,
      issued_by: user.id,
      expires_at: expiresAt,
      becomes_past_at: becomesPastAt,
      is_active: true,
      popup_shown: false,
    });

    // Update user standing
    const { data: activePunishments } = await supabase
      .from("user_punishments")
      .select("*")
      .eq("user_id", data.user_id)
      .in("type", ["warn", "suspend"])
      .gt("becomes_past_at", new Date().toISOString());

    const standingLevel = Math.min((activePunishments?.length || 0), 4);

    // Check for badge override
    const { data: userBadges } = await supabase
      .from("user_badges")
      .select("*, badge:badges(*)")
      .eq("user_id", data.user_id);

    const hasOverride = userBadges?.some((ub: { badge?: { affects_standing?: boolean } }) => ub.badge?.affects_standing);

    await supabase
      .from("users")
      .update({
        standing_level: hasOverride ? 0 : standingLevel,
        is_suspended: data.type === "suspend" || data.type === "ban" || standingLevel >= 4,
        is_banned: data.type === "ban",
        suspension_reason: data.type === "ban" || data.type === "suspend" ? data.reason : undefined,
        suspension_end: expiresAt,
      })
      .eq("id", data.user_id);

    // Send system DM
    const { data: dmChannel } = await supabase
      .from("dm_channels")
      .select("*")
      .or(
        `and(user1_id.eq.00000000-0000-0000-0000-000000000001,user2_id.eq.${data.user_id}),and(user1_id.eq.${data.user_id},user2_id.eq.00000000-0000-0000-0000-000000000001)`
      )
      .single();

    let dmChannelId = dmChannel?.id;
    if (!dmChannelId) {
      const { data: newDm } = await supabase
        .from("dm_channels")
        .insert({
          user1_id: "00000000-0000-0000-0000-000000000001",
          user2_id: data.user_id,
        })
        .select()
        .single();
      dmChannelId = newDm?.id;
    }

    if (dmChannelId) {
      await supabase.from("messages").insert({
        content: `⚠️ You have received a **${data.type}**.\n\nFor the following reason: ${data.reason}.\n${expiresAt ? `This action will expire at ${new Date(expiresAt).toLocaleDateString()}.` : "This action is permanent."}`,
        dm_channel_id: dmChannelId,
        author_id: "00000000-0000-0000-0000-000000000001",
      });
    }

    // Auto suspension at standing 4
    if (!hasOverride && standingLevel >= 4 && data.type !== "ban") {
      const autoExpires = new Date(Date.now() + 30 * 86400000).toISOString();
      await supabase.from("user_punishments").insert({
        user_id: data.user_id,
        type: "suspend",
        reason: "Reached worst standing",
        issued_by: "00000000-0000-0000-0000-000000000001",
        expires_at: autoExpires,
        becomes_past_at: autoExpires,
        is_active: true,
        popup_shown: false,
      });

      await supabase
        .from("users")
        .update({
          is_suspended: true,
          suspension_reason: "Reached worst standing",
          suspension_end: autoExpires,
        })
        .eq("id", data.user_id);
    }
  },

  createBadge: async (data) => {
    const supabase = createClient();
    const insertData = {
      name: data.name,
      description: data.description || null,
      icon: data.icon || "⭐",
      icon_url: data.icon_url || null,
      type: data.type,
      affects_standing: data.standing_override !== undefined && data.standing_override !== null,
      standing_override: data.standing_override ?? null,
    };
    const { error } = await supabase.from("badges").insert(insertData);
    if (error) {
      console.error("Failed to create badge:", error);
      return;
    }
    await get().fetchAllBadges();
  },

  deleteBadge: async (badgeId) => {
    const supabase = createClient();
    await supabase.from("badges").delete().eq("id", badgeId);
    await get().fetchAllBadges();
  },

  assignBadgeToUser: async (userId, badgeId) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("user_badges").insert({
      user_id: userId,
      badge_id: badgeId,
      assigned_by: user.id,
    });

    // Recalculate standing
    const { data: userBadges } = await supabase
      .from("user_badges")
      .select("*, badge:badges(*)")
      .eq("user_id", userId);

    const hasOverride = userBadges?.some((ub: { badge?: { affects_standing?: boolean } }) => ub.badge?.affects_standing);
    if (hasOverride) {
      await supabase.from("users").update({ standing_level: 0 }).eq("id", userId);
    }
  },

  removeBadgeFromUser: async (userId, badgeId) => {
    const supabase = createClient();
    await supabase
      .from("user_badges")
      .delete()
      .eq("user_id", userId)
      .eq("badge_id", badgeId);
  },

  assignBadgeToServer: async (serverId, badgeId) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("server_badges").insert({
      server_id: serverId,
      badge_id: badgeId,
      assigned_by: user.id,
    });
  },

  removeBadgeFromServer: async (serverId, badgeId) => {
    const supabase = createClient();
    await supabase
      .from("server_badges")
      .delete()
      .eq("server_id", serverId)
      .eq("badge_id", badgeId);
  },

  createBot: async (data) => {
    const supabase = createClient();
    await supabase.from("users").insert({
      email: `${data.username.toLowerCase()}@bot.ricord.app`,
      username: data.username,
      display_name: data.display_name || data.username,
      about_me: data.bio || null,
      avatar_url: data.avatar_url || null,
      is_bot: true,
      is_messagable: data.is_messagable,
      role: "user",
      bot_token: crypto.randomUUID(),
    });
    await get().fetchAllUsers();
  },

  deleteBot: async (botId) => {
    const supabase = createClient();
    if (botId === "00000000-0000-0000-0000-000000000001") return; // Protect system bot
    await supabase.from("users").delete().eq("id", botId).eq("is_bot", true);
    await get().fetchAllUsers();
  },

  updateBot: async (botId, data) => {
    const supabase = createClient();
    if (botId === "00000000-0000-0000-0000-000000000001") return;
    await supabase.from("users").update(data).eq("id", botId);
    await get().fetchAllUsers();
  },
}));
