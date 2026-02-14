"use client";

import { useState, useEffect, useCallback } from "react";
import { useServerStore } from "@/stores/server-store";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Link as LinkIcon,
  Settings,
  Palette,
  Tag,
  Hash,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";
import { ServerInvite } from "@/types";
import { Switch } from "@/components/ui/switch";

const BANNER_PRESETS = [
  "#5865F2", "#57F287", "#FEE75C", "#EB459E", "#ED4245",
  "#3498DB", "#E67E22", "#9B59B6", "#1ABC9C", "#2ECC71",
  "#E74C3C", "#F39C12", "#8E44AD", "#2C3E50", "#16A085",
];

type SettingsTab = "overview" | "invites";

interface ServerSettingsProps {
  serverId: string;
  onClose: () => void;
}

export function ServerSettings({ serverId, onClose }: ServerSettingsProps) {
  const { currentServer, updateServer, fetchServers } = useServerStore();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<SettingsTab>("overview");

  // Overview fields
  const [name, setName] = useState(currentServer?.name || "");
  const [description, setDescription] = useState(currentServer?.description || "");
  const [bannerColor, setBannerColor] = useState(currentServer?.banner_color || "#5865F2");
  const [tag, setTag] = useState(currentServer?.tag || "");
  const [isDiscoverable, setIsDiscoverable] = useState(currentServer?.is_discoverable || false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState(currentServer?.banner_color || "#5865F2");

  // Invites
  const [invites, setInvites] = useState<ServerInvite[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [newInviteExpiry, setNewInviteExpiry] = useState("7");
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // Sync from currentServer
  useEffect(() => {
    if (currentServer) {
      setName(currentServer.name);
      setDescription(currentServer.description || "");
      setBannerColor(currentServer.banner_color || "#5865F2");
      setTag(currentServer.tag || "");
      setIsDiscoverable(currentServer.is_discoverable || false);
      setCustomColor(currentServer.banner_color || "#5865F2");
    }
  }, [currentServer]);

  // Fetch invites when tab changes
  useEffect(() => {
    if (tab === "invites") {
      fetchInvites();
    }
  }, [tab]);

  const fetchInvites = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("server_invites")
      .select("*")
      .eq("server_id", serverId)
      .order("created_at", { ascending: false });
    setInvites((data as ServerInvite[]) || []);
  };

  // Auto-save name on blur
  const handleNameBlur = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentServer?.name) return;
    await updateServer(serverId, { name: trimmed });
    await fetchServers();
  }, [name, currentServer, serverId, updateServer, fetchServers]);

  // Auto-save description on blur
  const handleDescriptionBlur = useCallback(async () => {
    if (description === (currentServer?.description || "")) return;
    await updateServer(serverId, { description: description || null } as Record<string, unknown> & { description: string | null });
    await fetchServers();
  }, [description, currentServer, serverId, updateServer, fetchServers]);

  // Auto-save tag on blur
  const handleTagBlur = useCallback(async () => {
    const trimmed = tag.trim().toUpperCase();
    setTag(trimmed);
    if (trimmed === (currentServer?.tag || "")) return;
    await updateServer(serverId, { tag: trimmed || null } as Record<string, unknown> & { tag: string | null });
    await fetchServers();
  }, [tag, currentServer, serverId, updateServer, fetchServers]);

  // Save banner color
  const handleColorSelect = async (color: string) => {
    setBannerColor(color);
    setCustomColor(color);
    await updateServer(serverId, { banner_color: color });
    await fetchServers();
  };

  // Create invite
  const handleCreateInvite = async () => {
    if (!user) return;
    setInviteLoading(true);
    const supabase = createClient();
    const code = generateInviteCode();
    const expiryDays = parseInt(newInviteExpiry);
    const expiresAt = expiryDays > 0
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await supabase.from("server_invites").insert({
      server_id: serverId,
      code,
      created_by: user.id,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
    });

    await fetchInvites();
    setInviteLoading(false);
  };

  // Delete invite
  const handleDeleteInvite = async (inviteId: string) => {
    const supabase = createClient();
    await supabase.from("server_invites").delete().eq("id", inviteId);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  };

  // Copy invite code
  const handleCopyInvite = (invite: ServerInvite) => {
    navigator.clipboard.writeText(invite.code);
    setCopiedInviteId(invite.id);
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex bg-discord-chat">
      {/* Sidebar */}
      <div className="w-56 bg-discord-channel flex flex-col border-r border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {currentServer?.name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Server Settings</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          <button
            onClick={() => setTab("overview")}
            className={cn(
              "w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2",
              tab === "overview"
                ? "bg-discord-active text-white"
                : "text-gray-400 hover:text-white hover:bg-discord-hover"
            )}
          >
            <Settings className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setTab("invites")}
            className={cn(
              "w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2",
              tab === "invites"
                ? "bg-discord-active text-white"
                : "text-gray-400 hover:text-white hover:bg-discord-hover"
            )}
          >
            <LinkIcon className="w-4 h-4" />
            Invites
          </button>
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
          <h2 className="text-lg font-semibold text-white">
            {tab === "overview" ? "Server Overview" : "Invite Management"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-discord-hover text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-2xl mx-auto p-8">
            {tab === "overview" && (
              <div className="space-y-8">
                {/* Banner preview */}
                <div>
                  <div
                    className="h-32 rounded-t-xl"
                    style={{ backgroundColor: bannerColor }}
                  />
                  <div className="bg-discord-darker rounded-b-xl p-4 border border-gray-800 border-t-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-16 h-16 rounded-full border-4 border-discord-darker -mt-12 flex items-center justify-center text-2xl font-bold text-white"
                        style={{ backgroundColor: bannerColor }}
                      >
                        {name?.charAt(0)?.toUpperCase() || "S"}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg">{name || "Server"}</h3>
                        {tag && (
                          <span className="text-xs bg-discord-brand/20 text-discord-brand px-2 py-0.5 rounded-full font-medium">
                            {tag}
                          </span>
                        )}
                      </div>
                    </div>
                    {description && (
                      <p className="text-sm text-gray-400 mt-3">{description}</p>
                    )}
                  </div>
                </div>

                {/* Server Name */}
                <div>
                  <Label className="text-xs font-bold text-gray-300 uppercase mb-2 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    Server Name
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleNameBlur}
                    placeholder="My Server"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs font-bold text-gray-300 uppercase mb-2">
                    Description
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    placeholder="Tell people about your server..."
                    className="min-h-[80px] resize-none"
                    maxLength={300}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">{description.length}/300</p>
                </div>

                {/* Server Tag */}
                <div>
                  <Label className="text-xs font-bold text-gray-300 uppercase mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Server Tag
                  </Label>
                  <Input
                    value={tag}
                    onChange={(e) => setTag(e.target.value.toUpperCase().slice(0, 6))}
                    onBlur={handleTagBlur}
                    placeholder="e.g. GAMING"
                    maxLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    A short tag for your server (max 6 characters). Displayed next to the server name.
                  </p>
                </div>

                {/* Banner Color */}
                <div>
                  <Label className="text-xs font-bold text-gray-300 uppercase mb-2 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    Banner Color
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {BANNER_PRESETS.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all border-2",
                          bannerColor === color
                            ? "border-white scale-110"
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {/* Custom color toggle */}
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center text-xs font-bold",
                        showColorPicker
                          ? "border-white bg-discord-darker text-white"
                          : "border-gray-600 bg-discord-darker text-gray-400 hover:border-gray-400"
                      )}
                    >
                      +
                    </button>
                  </div>

                  {showColorPicker && (
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                      />
                      <Input
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        onBlur={() => handleColorSelect(customColor)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleColorSelect(customColor); }}
                        className="w-28 font-mono text-sm"
                        placeholder="#5865F2"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleColorSelect(customColor)}
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                </div>

                {/* Discoverable */}
                <div className="bg-discord-darker rounded-lg p-4 border border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <div>
                        <Label className="text-sm font-semibold text-white">Discoverable</Label>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Allow anyone to find and join this server from the Explore page.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isDiscoverable}
                      onCheckedChange={async (checked) => {
                        setIsDiscoverable(checked);
                        await updateServer(serverId, { is_discoverable: checked } as Partial<typeof currentServer> & { is_discoverable: boolean });
                        await fetchServers();
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {tab === "invites" && (
              <div className="space-y-6">
                {/* Create new invite */}
                <div className="bg-discord-darker rounded-lg p-4 border border-gray-800">
                  <h3 className="text-sm font-semibold text-white mb-3">Create Invite Link</h3>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label className="text-xs font-bold text-gray-400 uppercase mb-1">Expire After</Label>
                      <select
                        value={newInviteExpiry}
                        onChange={(e) => setNewInviteExpiry(e.target.value)}
                        className="w-full bg-discord-dark border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-discord-brand"
                      >
                        <option value="1">1 day</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                        <option value="0">Never</option>
                      </select>
                    </div>
                    <Button
                      onClick={handleCreateInvite}
                      disabled={inviteLoading}
                      className="gap-2"
                    >
                      {inviteLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <LinkIcon className="w-4 h-4" />
                      )}
                      Create
                    </Button>
                  </div>
                </div>

                {/* List of invites */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
                    Active Invites — {invites.length}
                  </h3>
                  {invites.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No invite links yet. Create one above.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {invites.map((invite) => {
                        const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
                        return (
                          <div
                            key={invite.id}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg border",
                              isExpired
                                ? "bg-discord-darker/50 border-gray-800 opacity-60"
                                : "bg-discord-darker border-gray-800"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-mono text-sm">{invite.code}</span>
                                {isExpired && (
                                  <span className="text-xs text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Expired</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                <span>{invite.uses} uses</span>
                                {invite.expires_at ? (
                                  <span>
                                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span>Never expires</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyInvite(invite)}
                                className="p-2"
                                disabled={!!isExpired}
                              >
                                {copiedInviteId === invite.id ? (
                                  <Check className="w-4 h-4 text-discord-green" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteInvite(invite.id)}
                                className="p-2 text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
