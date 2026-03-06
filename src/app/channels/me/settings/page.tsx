"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore, Theme } from "@/stores/theme-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useServerStore } from "@/stores/server-store";
import { UserBadge, Punishment, NameFont, NAME_FONTS } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { getStandingInfo } from "@/lib/utils";
import { X, Upload, Check, Mail, Lock, Trash2, Shield, Award, Bell, BellOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";


const PRESET_COLORS = [
  "#5865f2", "#57f287", "#fee75c", "#eb459e", "#ed4245",
  "#f47b67", "#e67e22", "#1abc9c", "#3498db", "#9b59b6",
  "#2ecc71", "#e91e63", "#00bcd4", "#ff9800", "#607d8b",
  null, // represents "no color"
];

const THEME_OPTIONS: { id: Theme; label: string; description: string; preview: { bg: string; sidebar: string; chat: string; text: string } }[] = [
  {
    id: "dark",
    label: "Dark",
    description: "The classic dark theme",
    preview: { bg: "#1e1f22", sidebar: "#2b2d31", chat: "#313338", text: "#dbdee1" },
  },
  {
    id: "light",
    label: "Light",
    description: "A clean, bright theme",
    preview: { bg: "#e3e5e8", sidebar: "#f2f3f5", chat: "#ffffff", text: "#2e3338" },
  },
  {
    id: "sepia",
    label: "Sepia",
    description: "Warm, paper-like tones",
    preview: { bg: "#ddd3b8", sidebar: "#e8dfca", chat: "#f4edd8", text: "#3d3528" },
  },
  {
    id: "gray",
    label: "Gray",
    description: "Neutral and understated",
    preview: { bg: "#2a2d31", sidebar: "#33363b", chat: "#3a3d42", text: "#d0d3d7" },
  },
  {
    id: "blue",
    label: "Blue",
    description: "Cool, deep blue tones",
    preview: { bg: "#0f1923", sidebar: "#162030", chat: "#1a2332", text: "#d0dae8" },
  },
  {
    id: "purple",
    label: "Purple",
    description: "Rich, royal purple vibes",
    preview: { bg: "#180f26", sidebar: "#1f1630", chat: "#231a33", text: "#dcd0ea" },
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Deep black, GitHub-inspired",
    preview: { bg: "#010409", sidebar: "#0d1117", chat: "#0d1117", text: "#c9d1d9" },
  },
  {
    id: "forest",
    label: "Forest",
    description: "Earthy greens and deep woods",
    preview: { bg: "#111a0f", sidebar: "#162013", chat: "#1a2418", text: "#c8dcc4" },
  },
  {
    id: "rose",
    label: "Rosé",
    description: "Soft pink and warm hues",
    preview: { bg: "#1f1018", sidebar: "#241520", chat: "#2a1a22", text: "#e8d0d8" },
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm amber and burnt orange",
    preview: { bg: "#1e130c", sidebar: "#24180f", chat: "#2a1c14", text: "#e8d8cc" },
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Deep sea blues and teals",
    preview: { bg: "#081620", sidebar: "#0b1a24", chat: "#0e1e2a", text: "#c0dce8" },
  },
  {
    id: "mint",
    label: "Mint",
    description: "Light, fresh minty green",
    preview: { bg: "#c2e4d4", sidebar: "#e2f4ec", chat: "#f0faf5", text: "#1a3a2a" },
  },
  {
    id: "coffee",
    label: "Coffee",
    description: "Rich brown coffeehouse vibes",
    preview: { bg: "#201810", sidebar: "#261e14", chat: "#2c2218", text: "#e0d4c6" },
  },
  {
    id: "slate",
    label: "Slate",
    description: "Blue-gray professional tone",
    preview: { bg: "#141e26", sidebar: "#1a252c", chat: "#1e2a32", text: "#ccd8e0" },
  },
  {
    id: "cherry",
    label: "Cherry",
    description: "Bold, vibrant dark red",
    preview: { bg: "#200c16", sidebar: "#26101a", chat: "#2c1420", text: "#f0d0dc" },
  },
  {
    id: "nord",
    label: "Nord",
    description: "Arctic, cool color palette",
    preview: { bg: "#242933", sidebar: "#2a303c", chat: "#2e3440", text: "#d8dee9" },
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, settings, updateProfile, updateSettings } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const servers = useServerStore((s) => s.servers);
  const { mutedServers, toggleMuteServer, setMutedServers, setMutedChannels } = useNotificationStore();
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [notifyDms, setNotifyDms] = useState(true);
  const [notifyFriendRequests, setNotifyFriendRequests] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileColor, setProfileColor] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState("#5865f2");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [sendMode, setSendMode] = useState<string>("button_or_enter");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [punishments, setPunishments] = useState<Punishment[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [nameColor, setNameColor] = useState<string | null>(null);
  const [nameGradientStart, setNameGradientStart] = useState<string | null>(null);
  const [nameGradientEnd, setNameGradientEnd] = useState<string | null>(null);
  const [nameFont, setNameFont] = useState<NameFont>("default");
  const [nameColorMode, setNameColorMode] = useState<"none" | "solid" | "gradient">("none");
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [selectedServerTag, setSelectedServerTag] = useState<string | null>(null);
  const [tagSearch, setTagSearch] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setBio(user.about_me || "");
      setProfileColor(user.profile_color || null);
      if (user.profile_color) {
        setCustomColor(user.profile_color);
      }
      setAvatarPreview(user.avatar_url || null);
      setBannerPreview(user.banner_url || null);
      setSelectedServerTag(user.selected_server_tag || null);
      setNameColor(user.name_color || null);
      setNameGradientStart(user.name_gradient_start || null);
      setNameGradientEnd(user.name_gradient_end || null);
      setNameFont((user.name_font as NameFont) || "default");
      if (user.name_gradient_start && user.name_gradient_end) {
        setNameColorMode("gradient");
      } else if (user.name_color) {
        setNameColorMode("solid");
      } else {
        setNameColorMode("none");
      }
    }
    if (settings) {
      setSendMode(settings.send_mode || "button_or_enter");
      setNotifyMentions(settings.notify_mentions !== false);
      setNotifyDms(settings.notify_dms !== false);
      setNotifyFriendRequests(settings.notify_friend_requests !== false);
      if (settings.muted_servers) setMutedServers(settings.muted_servers);
      if (settings.muted_channels) setMutedChannels(settings.muted_channels);
    }
  }, [user, settings]);

  // Fetch badges and punishments
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    supabase
      .from("user_badges")
      .select("*, badge:badges(*)")
      .eq("user_id", user.id)
      .then(({ data }) => setBadges((data as UserBadge[]) || []));

    supabase
      .from("user_punishments")
      .select("*, issuer:users!user_punishments_issued_by_fkey(*)")
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false })
      .then(({ data }) => setPunishments((data as Punishment[]) || []));
  }, [user]);

  // Flash a brief "Saved!" indicator
  const flashSaved = useCallback(() => {
    setSaveStatus("Saved!");
    setTimeout(() => setSaveStatus(null), 1500);
  }, []);

  // Auto-save profile field
  const saveField = useCallback(async (field: string, value: unknown) => {
    if (!user) return;
    await updateProfile({ [field]: value });
    flashSaved();
  }, [user, updateProfile, flashSaved]);

  // Auto-save on profile color change
  const saveProfileColor = useCallback(async (color: string | null) => {
    setProfileColor(color);
    if (color) setCustomColor(color);
    if (!user) return;
    await updateProfile({ profile_color: color });
    flashSaved();
  }, [user, updateProfile, flashSaved]);

  // Auto-save send mode
  const handleSendModeChange = useCallback(async (mode: string) => {
    setSendMode(mode);
    await updateSettings({ send_mode: mode as "button_only" | "button_or_enter" | "button_or_shift_enter" });
    flashSaved();
  }, [updateSettings, flashSaved]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Auto-upload avatar
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile({ avatar_url: publicUrl });
      flashSaved();
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = () => setBannerPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Auto-upload banner
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${user.id}/banner.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("banners")
      .upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from("banners").getPublicUrl(path);
      await updateProfile({ banner_url: publicUrl });
      flashSaved();
    }
  };

  const handleRemoveBanner = async () => {
    if (!user) return;
    setBannerPreview(null);
    await updateProfile({ banner_url: null });
    flashSaved();
  };

  if (!user) return null;

  const standing = getStandingInfo(user.standing_level);

  return (
    <div className="flex-1 flex bg-discord-chat overflow-hidden">
      <div className="max-w-2xl mx-auto w-full py-10 px-6 overflow-y-auto pb-20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">User Settings</h1>
            {saveStatus && (
              <span className="text-xs text-discord-green bg-discord-green/10 px-2 py-1 rounded-full animate-in fade-in-0 zoom-in-95">
                {saveStatus}
              </span>
            )}
          </div>
          <button
            onClick={() => router.push("/channels/me")}
            className="p-2 bg-discord-active rounded-full hover:bg-discord-hover text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">My Account</TabsTrigger>
            <TabsTrigger value="standing">Standing</TabsTrigger>
            <TabsTrigger value="behaviour">Behaviour</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="space-y-6">
              <div className="bg-discord-darker rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
                
                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative group">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={avatarPreview || undefined} />
                      <AvatarFallback className="text-2xl">
                        {displayName?.charAt(0) || user.username?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      <Upload className="w-5 h-5 text-white" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{user.display_name}</p>
                    <p className="text-gray-400 text-sm">@{user.username}</p>
                  </div>
                </div>

                {/* Profile Banner */}
                <div className="mb-6">
                  <Label className="text-xs font-bold text-gray-300 uppercase mb-2">
                    Profile Banner
                  </Label>
                  <p className="text-xs text-gray-500 mb-2">Recommended size: 600x240. Displayed on your profile card.</p>
                  <div className="relative group rounded-lg overflow-hidden" style={{ height: bannerPreview ? "120px" : "80px" }}>
                    {bannerPreview ? (
                      <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: profileColor || "#5865f2" }}
                      >
                        <span className="text-xs text-white/50">No banner set</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <label className="px-3 py-1.5 bg-discord-brand rounded-md text-white text-xs font-medium cursor-pointer hover:bg-discord-brand/80 transition-colors">
                        <Upload className="w-3.5 h-3.5 inline mr-1" />
                        Upload
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleBannerChange}
                        />
                      </label>
                      {bannerPreview && (
                        <button
                          onClick={handleRemoveBanner}
                          className="px-3 py-1.5 bg-red-600 rounded-md text-white text-xs font-medium hover:bg-red-700 transition-colors"
                        >
                          <X className="w-3.5 h-3.5 inline mr-1" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Display Name - saves on blur */}
                <div className="mb-4">
                  <Label className="text-xs font-bold text-gray-300 uppercase mb-2">
                    Display Name
                  </Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={() => {
                      if (displayName.trim() && displayName !== (user.display_name || "")) {
                        saveField("display_name", displayName.trim());
                      }
                    }}
                    maxLength={32}
                  />
                </div>

                {/* Bio - saves on blur */}
                <div className="mb-4">
                  <Label className="text-xs font-bold text-gray-300 uppercase mb-2">
                    About Me
                  </Label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    onBlur={() => {
                      if (bio !== (user.about_me || "")) {
                        saveField("about_me", bio);
                      }
                    }}
                    className="w-full h-24 bg-discord-dark border border-gray-700 rounded-md px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-discord-brand"
                    maxLength={190}
                    placeholder="Tell us about yourself"
                  />
                  <p className="text-xs text-gray-500 mt-1">{bio.length}/190</p>
                </div>

                <Separator className="my-4" />

                {/* Profile Color - saves on click */}
                <div className="mb-4">
                  <Label className="text-xs font-bold text-gray-300 uppercase mb-2">
                    Profile Color
                  </Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Choose a color for your profile accent
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {PRESET_COLORS.map((color, i) => (
                      <button
                        key={i}
                        onClick={() => saveProfileColor(color)}
                        className="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center"
                        style={{
                          backgroundColor: color || "transparent",
                          borderColor: profileColor === color ? "#ffffff" : color || "#4a4d52",
                          transform: profileColor === color ? "scale(1.15)" : "scale(1)",
                        }}
                        title={color || "No color"}
                      >
                        {profileColor === color && (
                          <Check className="w-4 h-4" style={{ color: color ? "#fff" : "#999" }} />
                        )}
                        {!color && profileColor !== color && (
                          <X className="w-3 h-3 text-gray-500" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => {
                          setCustomColor(e.target.value);
                          setProfileColor(e.target.value);
                        }}
                        onBlur={() => {
                          if ((profileColor ?? null) !== (user.profile_color ?? null)) {
                            saveField("profile_color", profileColor);
                          }
                        }}
                        className="w-10 h-10 rounded-lg border-2 border-gray-600 cursor-pointer bg-transparent [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch-wrapper]:p-0.5"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={customColor}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomColor(val);
                          if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                            setProfileColor(val);
                          }
                        }}
                        onBlur={() => {
                          if (/^#[0-9A-Fa-f]{6}$/.test(customColor) && (profileColor ?? null) !== (user.profile_color ?? null)) {
                            saveField("profile_color", profileColor);
                          }
                        }}
                        placeholder="#5865f2"
                        maxLength={7}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  {profileColor && (
                    <div
                      className="mt-3 h-2 rounded-full"
                      style={{ backgroundColor: profileColor }}
                    />
                  )}
                </div>

                <Separator className="my-4" />

                {/* Name Customization */}
                <div className="mb-4">
                  <Label className="text-xs font-bold text-gray-300 uppercase mb-2">
                    Display Name Style
                  </Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Customize your display name font and color
                  </p>

                  {/* Preview */}
                  <div className="bg-discord-dark rounded-lg p-4 mb-4 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Preview:</span>
                    <span
                      className="text-lg font-bold"
                      style={{
                        fontFamily: NAME_FONTS[nameFont] || "inherit",
                        ...(nameColorMode === "gradient" && nameGradientStart && nameGradientEnd
                          ? {
                              background: `linear-gradient(90deg, ${nameGradientStart}, ${nameGradientEnd})`,
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              backgroundClip: "text",
                            }
                          : nameColorMode === "solid" && nameColor
                          ? { color: nameColor }
                          : { color: "white" }),
                      }}
                    >
                      {displayName || "Display Name"}
                    </span>
                  </div>

                  {/* Font selector */}
                  <div className="mb-3">
                    <Label className="text-xs text-gray-400 mb-1">Font</Label>
                    <select
                      value={nameFont}
                      onChange={(e) => {
                        const val = e.target.value as NameFont;
                        setNameFont(val);
                        saveField("name_font", val);
                      }}
                      className="w-full bg-discord-dark border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-discord-brand"
                    >
                      <option value="default">Default</option>
                      <option value="serif">Serif</option>
                      <option value="mono">Monospace</option>
                      <option value="cursive">Cursive</option>
                      <option value="fantasy">Fantasy</option>
                      <option value="rounded">Rounded</option>
                    </select>
                  </div>

                  {/* Color mode */}
                  <div className="mb-3">
                    <Label className="text-xs text-gray-400 mb-1">Name Color</Label>
                    <div className="flex gap-2">
                      {(["none", "solid", "gradient"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setNameColorMode(mode);
                            if (mode === "none") {
                              setNameColor(null);
                              setNameGradientStart(null);
                              setNameGradientEnd(null);
                              updateProfile({ name_color: null, name_gradient_start: null, name_gradient_end: null });
                              flashSaved();
                            }
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-sm capitalize transition-colors",
                            nameColorMode === mode
                              ? "bg-discord-brand text-white"
                              : "bg-discord-dark text-gray-400 hover:bg-discord-hover"
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {nameColorMode === "solid" && (
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={nameColor || "#ffffff"}
                        onChange={(e) => setNameColor(e.target.value)}
                        onBlur={() => {
                          saveField("name_color", nameColor);
                          updateProfile({ name_gradient_start: null, name_gradient_end: null });
                        }}
                        className="w-10 h-10 rounded-lg border-2 border-gray-600 cursor-pointer bg-transparent [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch-wrapper]:p-0.5"
                      />
                      <Input
                        value={nameColor || ""}
                        onChange={(e) => setNameColor(e.target.value)}
                        onBlur={() => {
                          if (nameColor && /^#[0-9A-Fa-f]{6}$/.test(nameColor)) {
                            saveField("name_color", nameColor);
                            updateProfile({ name_gradient_start: null, name_gradient_end: null });
                          }
                        }}
                        placeholder="#ffffff"
                        maxLength={7}
                        className="font-mono text-sm flex-1"
                      />
                    </div>
                  )}

                  {nameColorMode === "gradient" && (
                    <div className="space-y-3">
                      {/* Gradient Presets */}
                      <div>
                        <Label className="text-[10px] text-gray-500 mb-1">Presets</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            ["#5865f2", "#eb459e"],
                            ["#ff6b6b", "#feca57"],
                            ["#00d2d3", "#54a0ff"],
                            ["#5f27cd", "#48dbfb"],
                            ["#ff9ff3", "#feca57"],
                            ["#1dd1a1", "#10ac84"],
                            ["#ff6348", "#ff4757"],
                            ["#7158e2", "#3ae374"],
                            ["#3d3d3d", "#5865f2"],
                            ["#e84393", "#6c5ce7"],
                            ["#fd79a8", "#fdcb6e"],
                            ["#00b894", "#00cec9"],
                            ["#f39c12", "#e74c3c"],
                            ["#2980b9", "#6dd5fa"],
                            ["#c471ed", "#f64f59"],
                            ["#11998e", "#38ef7d"],
                            ["#ee0979", "#ff6a00"],
                            ["#fc4a1a", "#f7b733"],
                            ["#4568dc", "#b06ab3"],
                            ["#e44d26", "#f16529"],
                          ].map(([start, end], i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setNameGradientStart(start);
                                setNameGradientEnd(end);
                                updateProfile({ name_gradient_start: start, name_gradient_end: end, name_color: null });
                                flashSaved();
                              }}
                              className="w-10 h-6 rounded-full border-2 border-gray-600 hover:border-white transition-colors"
                              style={{ background: `linear-gradient(90deg, ${start}, ${end})` }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <Label className="text-[10px] text-gray-500">Start</Label>
                          <input
                            type="color"
                            value={nameGradientStart || "#5865f2"}
                            onChange={(e) => setNameGradientStart(e.target.value)}
                            onBlur={() => {
                              updateProfile({ name_gradient_start: nameGradientStart, name_gradient_end: nameGradientEnd || "#eb459e", name_color: null });
                              flashSaved();
                            }}
                            className="w-10 h-10 rounded-lg border-2 border-gray-600 cursor-pointer bg-transparent [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch-wrapper]:p-0.5"
                          />
                        </div>
                        <div className="flex-1 h-6 rounded-full" style={{ background: `linear-gradient(90deg, ${nameGradientStart || "#5865f2"}, ${nameGradientEnd || "#eb459e"})` }} />
                        <div>
                          <Label className="text-[10px] text-gray-500">End</Label>
                          <input
                            type="color"
                            value={nameGradientEnd || "#eb459e"}
                            onChange={(e) => setNameGradientEnd(e.target.value)}
                            onBlur={() => {
                              updateProfile({ name_gradient_start: nameGradientStart || "#5865f2", name_gradient_end: nameGradientEnd, name_color: null });
                              flashSaved();
                            }}
                            className="w-10 h-10 rounded-lg border-2 border-gray-600 cursor-pointer bg-transparent [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch-wrapper]:p-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Server Tag Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-300 uppercase">Server Tag</Label>
                  <p className="text-xs text-gray-400">Choose a server tag to display next to your name everywhere.</p>
                  <div className="relative">
                    <div
                      className="flex items-center justify-between p-2 rounded-md bg-discord-dark border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors"
                      onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
                    >
                      {selectedServerTag ? (
                        <span className="text-xs font-bold text-discord-brand bg-discord-brand/10 px-2 py-0.5 rounded-full">
                          {selectedServerTag}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">No tag selected</span>
                      )}
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${tagDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                    {tagDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-discord-darker border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-gray-700">
                          <Input
                            placeholder="Search tags..."
                            value={tagSearch}
                            onChange={(e) => setTagSearch(e.target.value)}
                            className="h-8 text-sm bg-discord-dark border-gray-600"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto p-1">
                          <button
                            onClick={async () => {
                              setSelectedServerTag(null);
                              setTagDropdownOpen(false);
                              setTagSearch("");
                              await updateProfile({ selected_server_tag: null });
                              flashSaved();
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              !selectedServerTag ? 'bg-discord-brand/20 text-white' : 'text-gray-300 hover:bg-discord-dark'
                            }`}
                          >
                            None
                          </button>
                          {(() => {
                            const allTags = Array.from(new Set(servers.flatMap(s => s.tags || [])));
                            const filtered = allTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()));
                            if (filtered.length === 0) return <p className="text-xs text-gray-500 px-3 py-2">No tags found</p>;
                            return filtered.map(tag => {
                              const tagServer = servers.find(s => (s.tags || []).includes(tag));
                              return (
                                <button
                                  key={tag}
                                  onClick={async () => {
                                    setSelectedServerTag(tag);
                                    setTagDropdownOpen(false);
                                    setTagSearch("");
                                    await updateProfile({ selected_server_tag: tag });
                                    flashSaved();
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                                    selectedServerTag === tag ? 'bg-discord-brand/20 text-white' : 'text-gray-300 hover:bg-discord-dark'
                                  }`}
                                >
                                  <span className="text-xs font-bold bg-discord-brand/10 text-discord-brand px-2 py-0.5 rounded-full">{tag}</span>
                                  {tagServer && <span className="text-xs text-gray-500 truncate">from {tagServer.name}</span>}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-4" />
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-bold text-gray-300 uppercase">Username</Label>
                    <p className="text-white text-sm mt-1">{user.username}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-gray-300 uppercase">Email</Label>
                    <p className="text-white text-sm mt-1">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-gray-300 uppercase">Role</Label>
                    <p className="text-white text-sm mt-1 capitalize">{user.role}</p>
                  </div>
                </div>
              </div>

              {/* Badges Section */}
              <div className="bg-discord-darker rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-discord-brand" />
                  <h2 className="text-lg font-semibold text-white">Badges & Awards</h2>
                </div>
                {badges.length === 0 ? (
                  <p className="text-sm text-gray-400">You don&apos;t have any badges yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {badges.map((ub) => (
                      <div
                        key={ub.id}
                        className="flex items-center gap-3 bg-discord-dark rounded-lg p-3"
                      >
                        <div className="w-10 h-10 rounded-lg bg-discord-channel flex items-center justify-center text-xl">
                          {ub.badge?.icon || "\u2B50"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{ub.badge?.name || "Badge"}</p>
                          {ub.badge?.description && (
                            <p className="text-xs text-gray-400 truncate">{ub.badge.description}</p>
                          )}
                          <p className="text-[10px] text-gray-500">
                            Awarded {new Date(ub.assigned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Account Management */}
              <div className="bg-discord-darker rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Account Management</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => { setNewEmail(user.email || ""); setAccountError(null); setAccountSuccess(null); setShowEmailDialog(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-discord-dark rounded-lg hover:bg-discord-hover transition-colors text-left"
                  >
                    <Mail className="w-5 h-5 text-discord-brand" />
                    <div>
                      <p className="text-sm font-medium text-white">Change Email</p>
                      <p className="text-xs text-gray-400">Update your account email address</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setNewPassword(""); setConfirmPassword(""); setAccountError(null); setAccountSuccess(null); setShowPasswordDialog(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-discord-dark rounded-lg hover:bg-discord-hover transition-colors text-left"
                  >
                    <Lock className="w-5 h-5 text-discord-yellow" />
                    <div>
                      <p className="text-sm font-medium text-white">Change Password</p>
                      <p className="text-xs text-gray-400">Update your account password</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setDeleteConfirmText(""); setAccountError(null); setShowDeleteDialog(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-discord-red/10 border border-discord-red/20 rounded-lg hover:bg-discord-red/20 transition-colors text-left"
                  >
                    <Trash2 className="w-5 h-5 text-discord-red" />
                    <div>
                      <p className="text-sm font-medium text-discord-red">Delete Account</p>
                      <p className="text-xs text-gray-400">Permanently delete your account and all data</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Standing Tab */}
          <TabsContent value="standing">
            <div className="space-y-6">
              {/* Standing Level */}
              <div className="bg-discord-darker rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5" style={{ color: standing.color }} />
                  <h2 className="text-lg font-semibold text-white">Account Standing</h2>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                    style={{ backgroundColor: standing.color }}
                  >
                    {user.standing_level}
                  </div>
                  <div>
                    <p className="text-xl font-bold" style={{ color: standing.color }}>
                      {standing.title}
                    </p>
                    <p className="text-sm text-gray-400">{standing.description}</p>
                  </div>
                </div>

                {/* Standing bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Perfect</span>
                    <span>Suspended</span>
                  </div>
                  <div className="h-3 bg-discord-dark rounded-full overflow-hidden flex">
                    {[0, 1, 2, 3, 4].map((level) => {
                      const info = getStandingInfo(level);
                      return (
                        <div
                          key={level}
                          className="h-full flex-1 transition-opacity"
                          style={{
                            backgroundColor: info.color,
                            opacity: level <= user.standing_level ? 1 : 0.15,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {user.is_suspended && (
                  <div className="mt-4 bg-discord-red/10 border border-discord-red/20 rounded-lg p-4">
                    <p className="text-sm font-semibold text-discord-red">Account Suspended</p>
                    {user.suspension_reason && (
                      <p className="text-sm text-gray-300 mt-1">Reason: {user.suspension_reason}</p>
                    )}
                    {user.suspension_end && (
                      <p className="text-xs text-gray-400 mt-1">
                        Until: {new Date(user.suspension_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Punishment History */}
              <div className="bg-discord-darker rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Punishment History</h2>
                {punishments.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-discord-green mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-gray-400">Clean record! No punishments on file.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {punishments.map((p) => (
                      <div
                        key={p.id}
                        className={`rounded-lg p-4 border ${
                          p.is_active
                            ? "bg-discord-red/5 border-discord-red/20"
                            : "bg-discord-dark border-gray-700/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                              p.type === "warn" ? "bg-discord-yellow/20 text-discord-yellow" :
                              p.type === "suspend" ? "bg-orange-500/20 text-orange-400" :
                              "bg-discord-red/20 text-discord-red"
                            }`}>
                              {p.type}
                            </span>
                            {p.is_active && (
                              <span className="text-[10px] bg-discord-red/20 text-discord-red px-1.5 py-0.5 rounded">ACTIVE</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(p.issued_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{p.reason}</p>
                        {p.issuer && (
                          <p className="text-xs text-gray-500 mt-1">By: {p.issuer.display_name}</p>
                        )}
                        {p.expires_at && (
                          <p className="text-xs text-gray-500">Expires: {new Date(p.expires_at).toLocaleDateString()}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="behaviour">
            <div className="bg-discord-darker rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Message Behaviour</h2>
              
              <div className="mb-6">
                <Label className="text-xs font-bold text-gray-300 uppercase mb-2">
                  Send Mode
                </Label>
                <p className="text-xs text-gray-400 mb-3">
                  How messages are sent in chat
                </p>
                <Select value={sendMode} onValueChange={handleSendModeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="button_only">
                      Button Only — Send with button click only
                    </SelectItem>
                    <SelectItem value="button_or_enter">
                      Enter to Send — Press Enter or click button
                    </SelectItem>
                    <SelectItem value="button_or_shift_enter">
                      Shift+Enter to Send — Press Shift+Enter or click button
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="bg-discord-darker rounded-lg p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Notification Settings</h2>
                <p className="text-sm text-gray-400">Control what notifications you receive</p>
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                {[
                  { label: "Mentions", desc: "@mentions from other users", value: notifyMentions, key: "notify_mentions", setter: setNotifyMentions },
                  { label: "Direct Messages", desc: "New direct messages", value: notifyDms, key: "notify_dms", setter: setNotifyDms },
                  { label: "Friend Requests", desc: "Incoming friend requests", value: notifyFriendRequests, key: "notify_friend_requests", setter: setNotifyFriendRequests },
                ].map((opt) => (
                  <div key={opt.key} className="flex items-center justify-between p-4 bg-discord-dark rounded-lg border border-gray-800">
                    <div className="flex items-center gap-3">
                      {opt.value ? <Bell className="w-4 h-4 text-discord-brand" /> : <BellOff className="w-4 h-4 text-gray-500" />}
                      <div>
                        <p className="text-sm font-medium text-white">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const next = !opt.value;
                        opt.setter(next);
                        await updateSettings({ [opt.key]: next });
                        flashSaved();
                      }}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        opt.value ? "bg-discord-brand" : "bg-gray-600"
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                          opt.value ? "translate-x-6" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Muted Servers */}
              <div>
                <h3 className="text-sm font-bold text-gray-300 uppercase mb-3">Muted Servers</h3>
                {servers.length === 0 ? (
                  <p className="text-gray-500 text-sm">You are not in any servers</p>
                ) : (
                  <div className="space-y-2">
                    {servers.map((server) => {
                      const isMuted = mutedServers.has(server.id);
                      return (
                        <div key={server.id} className="flex items-center justify-between p-3 bg-discord-dark rounded-lg border border-gray-800">
                          <div className="flex items-center gap-2">
                            {server.icon_url ? (
                              <img src={server.icon_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-discord-brand flex items-center justify-center text-[10px] font-bold text-white">
                                {server.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm text-white">{server.name}</span>
                          </div>
                          <button
                            onClick={async () => {
                              toggleMuteServer(server.id);
                              const next = new Set(mutedServers);
                              if (next.has(server.id)) next.delete(server.id);
                              else next.add(server.id);
                              await updateSettings({ muted_servers: Array.from(next) });
                            }}
                            className={cn(
                              "px-3 py-1 rounded text-xs transition-colors",
                              isMuted
                                ? "bg-gray-600 text-gray-300 hover:bg-gray-500"
                                : "bg-discord-dark text-gray-500 hover:bg-discord-hover border border-gray-700"
                            )}
                          >
                            {isMuted ? "Unmute" : "Mute"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="appearance">
            <div className="bg-discord-darker rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-2">Appearance</h2>
              <p className="text-sm text-gray-400 mb-6">
                Choose a theme for your Ricord experience
              </p>

              <div className="grid grid-cols-3 gap-4">
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`relative rounded-xl border-2 p-1 transition-all ${
                      theme === t.id
                        ? "border-discord-brand shadow-lg shadow-discord-brand/20"
                        : "border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    {/* Mini preview */}
                    <div
                      className="rounded-lg overflow-hidden h-24 flex"
                      style={{ backgroundColor: t.preview.bg }}
                    >
                      {/* Sidebar mock */}
                      <div
                        className="w-1/4 p-2 flex flex-col gap-1"
                        style={{ backgroundColor: t.preview.sidebar }}
                      >
                        <div
                          className="h-1.5 rounded-full w-3/4"
                          style={{ backgroundColor: t.preview.text, opacity: 0.4 }}
                        />
                        <div
                          className="h-1.5 rounded-full w-full"
                          style={{ backgroundColor: t.preview.text, opacity: 0.2 }}
                        />
                        <div
                          className="h-1.5 rounded-full w-5/6"
                          style={{ backgroundColor: t.preview.text, opacity: 0.2 }}
                        />
                      </div>
                      {/* Chat mock */}
                      <div
                        className="flex-1 p-2 flex flex-col justify-end gap-1.5"
                        style={{ backgroundColor: t.preview.chat }}
                      >
                        <div className="flex gap-1.5 items-start">
                          <div
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: "#5865f2" }}
                          />
                          <div className="flex-1">
                            <div
                              className="h-1.5 rounded-full w-1/3 mb-1"
                              style={{ backgroundColor: t.preview.text, opacity: 0.5 }}
                            />
                            <div
                              className="h-1.5 rounded-full w-3/4"
                              style={{ backgroundColor: t.preview.text, opacity: 0.25 }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-1.5 items-start">
                          <div
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: "#23a559" }}
                          />
                          <div className="flex-1">
                            <div
                              className="h-1.5 rounded-full w-1/4 mb-1"
                              style={{ backgroundColor: t.preview.text, opacity: 0.5 }}
                            />
                            <div
                              className="h-1.5 rounded-full w-2/3"
                              style={{ backgroundColor: t.preview.text, opacity: 0.25 }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Label */}
                    <div className="px-2 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-left" style={{ color: "var(--rc-text)" }}>
                          {t.label}
                        </p>
                        <p className="text-xs text-left" style={{ color: "var(--rc-muted)" }}>
                          {t.description}
                        </p>
                      </div>
                      {theme === t.id && (
                        <div className="w-5 h-5 rounded-full bg-discord-brand flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Change Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              Enter your new email address. You will receive a confirmation link.
            </DialogDescription>
          </DialogHeader>
          {accountError && <p className="text-discord-red text-sm">{accountError}</p>}
          {accountSuccess && <p className="text-discord-green text-sm">{accountSuccess}</p>}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase mb-2">New Email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
            <Button
              disabled={accountLoading || !newEmail.trim() || newEmail === user.email}
              onClick={async () => {
                setAccountLoading(true);
                setAccountError(null);
                setAccountSuccess(null);
                try {
                  const supabase = createClient();
                  const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
                  if (error) throw error;
                  setAccountSuccess("Confirmation email sent! Check your inbox.");
                } catch (err: unknown) {
                  setAccountError(err instanceof Error ? err.message : "Failed to update email");
                } finally {
                  setAccountLoading(false);
                }
              }}
            >
              {accountLoading ? "Sending..." : "Update Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your new password. Must be at least 6 characters.
            </DialogDescription>
          </DialogHeader>
          {accountError && <p className="text-discord-red text-sm">{accountError}</p>}
          {accountSuccess && <p className="text-discord-green text-sm">{accountSuccess}</p>}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase mb-2">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase mb-2">Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
            <Button
              disabled={accountLoading || newPassword.length < 6 || newPassword !== confirmPassword}
              onClick={async () => {
                setAccountLoading(true);
                setAccountError(null);
                setAccountSuccess(null);
                try {
                  const supabase = createClient();
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  if (error) throw error;
                  setAccountSuccess("Password updated successfully!");
                  setNewPassword("");
                  setConfirmPassword("");
                } catch (err: unknown) {
                  setAccountError(err instanceof Error ? err.message : "Failed to update password");
                } finally {
                  setAccountLoading(false);
                }
              }}
            >
              {accountLoading ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-discord-red">Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All your data, messages, servers and friendships will be deleted forever.
            </DialogDescription>
          </DialogHeader>
          {accountError && <p className="text-discord-red text-sm">{accountError}</p>}
          <div className="bg-discord-red/10 border border-discord-red/20 rounded-lg p-3">
            <p className="text-sm text-gray-300">
              Type <span className="font-bold text-white">DELETE</span> to confirm account deletion.
            </p>
          </div>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="font-mono"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              className="bg-discord-red hover:bg-discord-red-hover text-white"
              disabled={accountLoading || deleteConfirmText !== "DELETE"}
              onClick={async () => {
                setAccountLoading(true);
                setAccountError(null);
                try {
                  const supabase = createClient();
                  // Delete user profile data first
                  await supabase.from("users").delete().eq("id", user.id);
                  // Sign out
                  await supabase.auth.signOut();
                  router.push("/auth/login");
                } catch (err: unknown) {
                  setAccountError(err instanceof Error ? err.message : "Failed to delete account");
                  setAccountLoading(false);
                }
              }}
            >
              {accountLoading ? "Deleting..." : "Delete My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
