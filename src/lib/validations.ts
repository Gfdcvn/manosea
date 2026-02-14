import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  displayName: z.string().min(1, "Display name is required").max(32),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const serverSchema = z.object({
  name: z.string().min(1, "Server name is required").max(100),
  icon_url: z.string().url().optional().or(z.literal("")),
});

export const channelSchema = z.object({
  name: z.string()
    .min(1, "Channel name is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Channel name can only contain lowercase letters, numbers, and hyphens"),
  type: z.enum(["text", "voice"]),
  category_id: z.string().uuid().optional(),
});

export const messageSchema = z.object({
  content: z.string().max(4000, "Message is too long").optional(),
  attachments: z.array(z.string()).optional(),
});

export const profileSchema = z.object({
  display_name: z.string().min(1).max(32),
  about_me: z.string().max(190).optional(),
  avatar_url: z.string().url().optional().or(z.literal("")),
  banner_url: z.string().url().optional().or(z.literal("")),
  profile_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const punishmentSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum(["warn", "suspend", "ban"]),
  reason: z.string().min(1, "Reason is required").max(1000),
  severity: z.number().min(1).max(5).optional(),
  duration_days: z.number().min(0).optional(),
});

export const badgeSchema = z.object({
  name: z.string().min(1, "Badge name is required").max(50),
  icon_url: z.string().url("Must be a valid URL"),
  type: z.enum(["user", "server"]),
  affects_standing: z.boolean().default(false),
});

export const botSchema = z.object({
  username: z.string().min(1).max(32),
  avatar_url: z.string().url().optional().or(z.literal("")),
  is_messagable: z.boolean().default(true),
});

export const behaviourSettingsSchema = z.object({
  send_mode: z.enum(["button_only", "button_or_enter", "button_or_shift_enter"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ServerInput = z.infer<typeof serverSchema>;
export type ChannelInput = z.infer<typeof channelSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type PunishmentInput = z.infer<typeof punishmentSchema>;
export type BadgeInput = z.infer<typeof badgeSchema>;
export type BotInput = z.infer<typeof botSchema>;
export type BehaviourSettingsInput = z.infer<typeof behaviourSettingsSchema>;
