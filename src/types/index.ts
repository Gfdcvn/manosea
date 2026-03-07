export type UserStatus = "online" | "idle" | "dnd" | "invisible" | "offline";
export type UserRole = "user" | "admin" | "superadmin";
export type PunishmentType = "warn" | "mute" | "suspend" | "ban";
export type BadgeType = "user" | "server";
export type ChannelType = "text" | "voice";
export type SendMode = "button_only" | "button_or_enter" | "button_or_shift_enter";

export type NameFont = "default" | "serif" | "mono" | "cursive" | "fantasy" | "rounded";

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
  name_color: string | null;
  name_gradient_start: string | null;
  name_gradient_end: string | null;
  name_font: NameFont;
  selected_server_tag: string | null;
  custom_status: string | null;
  custom_status_expires_at: string | null;
  nameplate: NameplateConfig | null;
  avatar_ring: AvatarRingConfig | null;
  name_effect: NameEffect;
  profile_glow: string | null;
  chat_bubble_color: string | null;
  created_at: string;
}

export interface NameplateStop {
  color: string;
  position: number; // 0-100
}

export interface NameplateConfig {
  stops: NameplateStop[];
  angle: number;
  pattern: string | null; // "dots" | "stripes" | "waves" | "grid" | "diamonds" | null
  patternOpacity: number;
  glow: boolean;
  glowColor: string;
  borderStyle: string | null; // "solid" | "dashed" | "double" | null
  borderColor: string;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  animation: NameplateAnimation;
}

export type NameplateAnimation = "none" | "shimmer" | "pulse" | "colorShift" | "breathe";

export type NameEffect = "none" | "shimmer" | "rainbow" | "glowPulse" | "sparkle" | "neon" | "glitch" | "typewriter" | "fire";

export interface AvatarRingConfig {
  color1: string;
  color2: string;
  style: "solid" | "gradient" | "animated";
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
  banner_gradient_start: string | null;
  banner_gradient_end: string | null;
  banner_gradient_angle: number | null;
  tag: string | null;
  tags: string[];
  tag_icons: Record<string, string>;
  owner_id: string;
  is_suspended: boolean;
  is_discoverable: boolean;
  is_verified: boolean;
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

export interface RoleChannelOverride {
  id: string;
  role_id: string;
  channel_id: string;
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
  notify_mentions: boolean;
  notify_dms: boolean;
  notify_friend_requests: boolean;
  muted_servers: string[];
  muted_channels: string[];
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

// Pinned messages
export interface PinnedMessage {
  id: string;
  message_id: string;
  channel_id: string | null;
  dm_channel_id: string | null;
  pinned_by: string;
  pinned_at: string;
  message?: Message;
}

// Channel permission overrides
export interface ChannelPermissionOverride {
  id: string;
  channel_id: string;
  role_id: string | null;
  user_id: string | null;
  allow_permissions: number;
  deny_permissions: number;
  created_at: string;
}

// Reports
export type ReportType = "user" | "message" | "server";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface Report {
  id: string;
  reporter_id: string;
  report_type: ReportType;
  target_user_id: string | null;
  target_message_id: string | null;
  target_server_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter?: User;
  target_user?: User;
  target_server?: Server;
}

// Name font CSS mapping
export const NAME_FONTS: Record<NameFont, string> = {
  default: "inherit",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Fira Code', 'Cascadia Code', monospace",
  cursive: "'Segoe Script', 'Comic Sans MS', cursive",
  fantasy: "Impact, fantasy",
  rounded: "'Nunito', 'Quicksand', sans-serif",
};

// ====== Bot System Types ======

export type BotStatus = "online" | "offline" | "error";

export interface Bot {
  id: string;
  user_id: string;   // the bot's user account (is_bot=true)
  owner_id: string;
  name: string;
  avatar_url: string | null;
  description: string | null;
  token: string;
  status: BotStatus;
  is_public: boolean;
  created_at: string;
}

export type NodeType =
  // Triggers (12)
  | "trigger_on_message"        // server message received
  | "trigger_on_dm"             // DM received
  | "trigger_on_mention"        // bot @mentioned
  | "trigger_on_join"           // user joins server
  | "trigger_on_leave"          // user leaves server
  | "trigger_on_reaction"       // reaction added
  | "trigger_on_command"        // slash command / prefix command
  | "trigger_on_keyword"        // message contains keyword
  | "trigger_on_schedule"       // timed interval (minutes)
  | "trigger_on_channel_create" // channel created
  | "trigger_on_role_change"    // user role changed
  | "trigger_on_bot_start"      // bot starts up
  // Actions (30)
  | "action_send_message"       // send a message to a channel
  | "action_send_dm"            // DM a user
  | "action_reply"              // reply to the trigger message
  | "action_add_reaction"       // add a reaction to a message
  | "action_delete_message"     // delete a message
  | "action_pin_message"        // pin a message
  | "action_create_channel"     // create a text channel
  | "action_delete_channel"     // delete a channel
  | "action_rename_channel"     // rename a channel
  | "action_assign_role"        // assign role to user
  | "action_remove_role"        // remove role from user
  | "action_kick_user"          // kick user from server
  | "action_ban_user"           // ban user from server
  | "action_mute_user"          // server mute user
  | "action_set_nickname"       // set a user's nickname
  | "action_send_embed"         // send a rich embed message
  | "action_edit_message"       // edit a bot message
  | "action_add_delay"          // wait X seconds
  | "action_set_variable"       // store a value in bot memory
  | "action_get_variable"       // read from bot memory
  | "action_random_choice"      // pick random from list
  | "action_condition"          // if/else branch
  | "action_log"                // log to bot console
  | "action_http_request"       // make an HTTP GET/POST
  | "action_json_parse"         // parse JSON string
  | "action_math"               // math operation
  | "action_string_format"      // format a string with variables
  | "action_loop"               // repeat actions N times
  | "action_send_button"        // send a message with buttons
  | "action_counter"            // increment/decrement a counter
  // New nodes (10)
  | "action_send_typing"        // show typing indicator
  | "action_wait_for_message"   // wait for next user message
  | "action_regex_match"        // regex test on input
  | "action_switch"             // multi-branch switch/case
  | "action_foreach"            // iterate over a list
  | "action_store_list"         // manage a list (push/pop/clear)
  | "action_cooldown"           // rate-limit per user
  | "action_api_call"           // API call with headers/body
  | "action_embed_builder"      // build rich embed with fields
  | "action_poll"               // create a poll
  ;

export interface BotNodePosition {
  x: number;
  y: number;
}

export interface BotNode {
  id: string;
  type: NodeType;
  position: BotNodePosition;
  data: Record<string, unknown>;
}

export interface BotConnection {
  id: string;
  sourceNodeId: string;
  sourcePort: string;  // "out" or "true" / "false" for conditions
  targetNodeId: string;
  targetPort: string;  // "in"
}

export interface BotWorkflow {
  id: string;
  bot_id: string;
  name: string;
  nodes: BotNode[];
  connections: BotConnection[];
  variables: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ====== Reaction Roles ======

export interface ReactionRole {
  id: string;
  server_id: string;
  channel_id: string;
  message_id: string;
  emoji: string;
  role_id: string;
  role?: ServerRole;
  created_at: string;
}

// ====== Scheduled Messages ======

export interface ScheduledMessage {
  id: string;
  channel_id: string;
  dm_channel_id: string | null;
  user_id: string;
  content: string;
  scheduled_at: string;
  sent: boolean;
  created_at: string;
}
