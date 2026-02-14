"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore, Theme } from "@/stores/theme-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { X, Upload, Check } from "lucide-react";

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
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, settings, updateProfile, updateSettings } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileColor, setProfileColor] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState("#5865f2");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [sendMode, setSendMode] = useState<string>("button_or_enter");
  const [saving, setSaving] = useState(false);
  const [showConfirmBar, setShowConfirmBar] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setBio(user.about_me || "");
      setProfileColor(user.profile_color || null);
      if (user.profile_color) {
        setCustomColor(user.profile_color);
      }
      setAvatarPreview(user.avatar_url || null);
    }
    if (settings) {
      setSendMode(settings.send_mode || "button_or_enter");
    }
  }, [user, settings]);

  const hasChanges = () => {
    if (!user || !settings) return false;
    return (
      displayName !== (user.display_name || "") ||
      bio !== (user.about_me || "") ||
      profileColor !== (user.profile_color || null) ||
      avatarFile !== null ||
      sendMode !== (settings.send_mode || "button_or_enter")
    );
  };

  useEffect(() => {
    setShowConfirmBar(hasChanges());
  }, [displayName, bio, profileColor, avatarFile, sendMode]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      let avatarUrl = user.avatar_url;

      if (avatarFile) {
        const supabase = createClient();
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
          avatarUrl = publicUrl;
        }
      }

      await updateProfile({
        display_name: displayName,
        about_me: bio,
        avatar_url: avatarUrl,
        profile_color: profileColor,
      });

      await updateSettings({
        send_mode: sendMode as "button_only" | "button_or_enter" | "button_or_shift_enter",
      });

      setAvatarFile(null);
      setShowConfirmBar(false);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    if (user) {
      setDisplayName(user.display_name || "");
      setBio(user.about_me || "");
      setProfileColor(user.profile_color || null);
      if (user.profile_color) setCustomColor(user.profile_color);
      setAvatarPreview(user.avatar_url || null);
      setAvatarFile(null);
    }
    if (settings) {
      setSendMode(settings.send_mode || "button_or_enter");
    }
    setShowConfirmBar(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 flex bg-discord-chat overflow-hidden">
      <div className="max-w-2xl mx-auto w-full py-10 px-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">User Settings</h1>
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
            <TabsTrigger value="behaviour">Behaviour</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
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

              <Separator className="my-4" />

              {/* Display Name */}
              <div className="mb-4">
                <Label className="text-xs font-bold text-gray-300 uppercase mb-2">
                  Display Name
                </Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={32}
                />
              </div>

              {/* Bio */}
              <div className="mb-4">
                <Label className="text-xs font-bold text-gray-300 uppercase mb-2">
                  About Me
                </Label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full h-24 bg-discord-dark border border-gray-700 rounded-md px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-discord-brand"
                  maxLength={190}
                  placeholder="Tell us about yourself"
                />
                <p className="text-xs text-gray-500 mt-1">{bio.length}/190</p>
              </div>

              <Separator className="my-4" />

              {/* Profile Color */}
              <div className="mb-4">
                <Label className="text-xs font-bold text-gray-300 uppercase mb-2">
                  Profile Color
                </Label>
                <p className="text-xs text-gray-500 mb-3">
                  Choose a color for your profile accent
                </p>

                {/* Preset swatches */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_COLORS.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setProfileColor(color);
                        if (color) setCustomColor(color);
                      }}
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

                {/* Custom color input */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        setProfileColor(e.target.value);
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
                      placeholder="#5865f2"
                      maxLength={7}
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProfileColor(customColor)}
                    disabled={!/^#[0-9A-Fa-f]{6}$/.test(customColor)}
                  >
                    Apply
                  </Button>
                </div>

                {/* Preview */}
                {profileColor && (
                  <div
                    className="mt-3 h-2 rounded-full"
                    style={{ backgroundColor: profileColor }}
                  />
                )}
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
                <Select value={sendMode} onValueChange={setSendMode}>
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

          <TabsContent value="appearance">
            <div className="bg-discord-darker rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-2">Appearance</h2>
              <p className="text-sm text-gray-400 mb-6">
                Choose a theme for your Ricord experience
              </p>

              <div className="grid grid-cols-2 gap-4">
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

      {/* Confirm Bar */}
      {showConfirmBar && (
        <div className="fixed bottom-0 left-0 right-0 bg-discord-darker border-t border-gray-700 p-3 flex items-center justify-between px-6 z-50 animate-in slide-in-from-bottom-2">
          <p className="text-sm text-white">Careful — you have unsaved changes!</p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleRevert}>
              Revert
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
