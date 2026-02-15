export type UserStatus = "online" | "idle" | "dnd" | "invisible" | "offline";
export type UserRole = "user" | "admin" | "superadmin";
export type PunishmentType = "warn" | "mute" | "suspend" | "ban";
export type BadgeType = "user" | "server";
export type ChannelType = "text" | "voice";
export type SendMode = "button_only" | "button_or_enter" | "button_or_shift_enter";

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  profile_color: string | null;
  about_me: string | null;
  status: UserStatus;
  role: UserRole;
  standing_level: number;
  is_banned: boolean;
  is_suspended: boolean;
  is_muted: boolean;
  suspension_reason: string | null;
  suspension_end: string | null;
  mute_reason: string | null;
  mute_end: string | null;
  ban_reason: string | null;
  banned_by: string | null;
  is_bot: boolean;
  is_messagable: boolean;
  bot_token: string | null;
  last_punishment_seen_at: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  icon_url: string;
  type: BadgeType;
  affects_standing: boolean;
  standing_override: number | null;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  assigned_by: string;
  assigned_at: string;
  badge?: Badge;
}

export interface ServerBadge {
  id: string;
  server_id: string;
  badge_id: string;
  assigned_by: string;
  assigned_at: string;
  badge?: Badge;
}

export interface Server {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  banner_color: string | null;
  tag: string | null;
  owner_id: string;
  is_suspended: boolean;
  is_discoverable: boolean;
  suspension_reason: string | null;
  suspension_end: string | null;
  created_at: string;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: ChannelType;
  category_id: string | null;
  position: number;
  created_at: string;
}

export interface Category {
  id: string;
  server_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface ServerMember {
  id: string;
  server_id: string;
  user_id: string;
  role_id: string | null;
  joined_at: string;
  user?: User;
}

export interface ServerRole {
  id: string;
  server_id: string;
  name: string;
  color: string;
  icon: string | null;
  is_elevated: boolean;
  permissions: number;
  position: number;
  created_at: string;
}

// Permission bit flags
export const PERMISSIONS = {
  IS_ADMIN: 1 << 0,         // 1 - All permissions
  CREATE_CHANNELS: 1 << 1,  // 2
  CREATE_CATEGORIES: 1 << 2,// 4
  EDIT_SETTINGS: 1 << 3,    // 8
  EDIT_ROLES: 1 << 4,       // 16
  EDIT_MEMBERS: 1 << 5,     // 32
  MODERATE: 1 << 6,         // 64
  INVITE_PEOPLE: 1 << 7,    // 128
  SEND_MESSAGES: 1 << 8,    // 256
} as const;

export const PERMISSION_LABELS: Record<number, { name: string; description: string }> = {
  [PERMISSIONS.IS_ADMIN]: { name: "Administrator", description: "Full access to all permissions" },
  [PERMISSIONS.CREATE_CHANNELS]: { name: "Create Channels", description: "Can create text and voice channels" },
  [PERMISSIONS.CREATE_CATEGORIES]: { name: "Create Categories", description: "Can create channel categories" },
  [PERMISSIONS.EDIT_SETTINGS]: { name: "Edit Settings", description: "Can edit server settings" },
  [PERMISSIONS.EDIT_ROLES]: { name: "Edit Roles", description: "Can create, edit, and delete roles" },
  [PERMISSIONS.EDIT_MEMBERS]: { name: "Edit Members", description: "Can manage server members" },
  [PERMISSIONS.MODERATE]: { name: "Moderate", description: "Can mute, suspend, and ban members" },
  [PERMISSIONS.INVITE_PEOPLE]: { name: "Invite People", description: "Can create invite links" },
  [PERMISSIONS.SEND_MESSAGES]: { name: "Send Messages", description: "Can send messages in channels" },
};

export function hasPermission(permissions: number, flag: number): boolean {
  if (permissions & PERMISSIONS.IS_ADMIN) return true;
  return (permissions & flag) !== 0;
}

export interface ServerMemberRole {
  id: string;
  server_id: string;
  member_id: string;
  role_id: string;
  assigned_at: string;
}

export interface ServerBan {
  id: string;
  server_id: string;
  user_id: string;
  reason: string;
  banned_by: string;
  created_at: string;
}

export interface ServerMute {
  id: string;
  server_id: string;
  user_id: string;
  reason: string;
  duration_days: number;
  muted_by: string;
  expires_at: string;
  created_at: string;
}

export interface ServerSuspension {
  id: string;
  server_id: string;
  user_id: string;
  reason: string;
  duration_days: number;
  suspended_by: string;
  expires_at: string;
  created_at: string;
}

export interface ServerMemberNote {
  id: string;
  server_id: string;
  user_id: string;
  note: string;
  created_by: string;
  created_at: string;
}

export interface ChannelVisibilityOverride {
  id: string;
  channel_id: string;
  user_id: string;
  hidden: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  content: string | null;
  channel_id: string | null;
  dm_channel_id: string | null;
  author_id: string;
  author?: User;
  attachments?: Attachment[];
  created_at: string;
  updated_at: string | null;
  is_edited: boolean;
}

export interface Attachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface DMChannel {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  user1?: User;
  user2?: User;
  last_message?: Message;
}

export interface Punishment {
  id: string;
  user_id: string;
  type: PunishmentType;
  reason: string;
  severity: number | null;
  issued_by: string;
  issued_at: string;
  expires_at: string | null;
  becomes_past_at: string | null;
  is_active: boolean;
  popup_shown: boolean;
  issuer?: User;
}

export interface ServerInvite {
  id: string;
  server_id: string;
  code: string;
  created_by: string;
  uses: number;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  send_mode: SendMode;
  theme: string;
  created_at: string;
}

export interface TypingIndicator {
  channel_id: string;
  user_id: string;
  username: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  sender?: User;
  receiver?: User;
}
