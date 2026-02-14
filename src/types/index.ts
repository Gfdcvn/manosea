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
  permissions: number;
  position: number;
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
