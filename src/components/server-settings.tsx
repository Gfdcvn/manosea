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
  Shield,
  Users,
  Plus,
  ChevronLeft,
  Pencil,
  Ban,
  VolumeX,
  Clock,
  StickyNote,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";
import { ServerInvite, ServerRole, PERMISSION_LABELS } from "@/types";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const BANNER_PRESETS = [
  "#5865F2", "#57F287", "#FEE75C", "#EB459E", "#ED4245",
  "#3498DB", "#E67E22", "#9B59B6", "#1ABC9C", "#2ECC71",
  "#E74C3C", "#F39C12", "#8E44AD", "#2C3E50", "#16A085",
];

type SettingsTab = "overview" | "invites" | "roles" | "members";

interface ServerSettingsProps {
  serverId: string;
  onClose: () => void;
}

export function ServerSettings({ serverId, onClose }: ServerSettingsProps) {
  const { currentServer, updateServer, fetchServers, roles, members, memberRoles, 
    createRole, updateRole, deleteRole, assignRole, removeRole, getMemberRoles, getMemberPermissions,
    serverBanUser, serverMuteUser, serverUnmuteUser, serverSuspendUser, serverUnsuspendUser,
    addMemberNote, deleteMemberNote, setChannelVisibility, removeChannelVisibility,
    setRoleChannelVisibility, removeRoleChannelVisibility, roleChannelOverrides,
    fetchServerModeration, serverMutes, serverSuspensions, memberNotes, channelOverrides, channels,
  } = useServerStore();
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
          <button
            onClick={() => setTab("roles")}
            className={cn(
              "w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2",
              tab === "roles"
                ? "bg-discord-active text-white"
                : "text-gray-400 hover:text-white hover:bg-discord-hover"
            )}
          >
            <Shield className="w-4 h-4" />
            Roles
          </button>
          <button
            onClick={() => setTab("members")}
            className={cn(
              "w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2",
              tab === "members"
                ? "bg-discord-active text-white"
                : "text-gray-400 hover:text-white hover:bg-discord-hover"
            )}
          >
            <Users className="w-4 h-4" />
            Members
          </button>
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
          <h2 className="text-lg font-semibold text-white">
            {tab === "overview" ? "Server Overview" : tab === "invites" ? "Invite Management" : tab === "roles" ? "Roles" : "Members"}
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

            {tab === "roles" && (
              <RolesTab
                serverId={serverId}
                roles={roles}
                channels={channels}
                roleChannelOverrides={roleChannelOverrides}
                setRoleChannelVisibility={setRoleChannelVisibility}
                removeRoleChannelVisibility={removeRoleChannelVisibility}
                createRole={createRole}
                updateRole={updateRole}
                deleteRole={deleteRole}
              />
            )}

            {tab === "members" && (
              <MembersTab
                serverId={serverId}
                members={members}
                roles={roles}
                memberRoles={memberRoles}
                channels={channels}
                getMemberRoles={getMemberRoles}
                getMemberPermissions={getMemberPermissions}
                assignRole={assignRole}
                removeRole={removeRole}
                serverBanUser={serverBanUser}
                serverMuteUser={serverMuteUser}
                serverSuspendUser={serverSuspendUser}
                serverUnmuteUser={serverUnmuteUser}
                serverUnsuspendUser={serverUnsuspendUser}
                addMemberNote={addMemberNote}
                deleteMemberNote={deleteMemberNote}
                setChannelVisibility={setChannelVisibility}
                removeChannelVisibility={removeChannelVisibility}
                fetchServerModeration={fetchServerModeration}
                serverMutes={serverMutes}
                serverSuspensions={serverSuspensions}
                memberNotes={memberNotes}
                channelOverrides={channelOverrides}
                currentUserId={user?.id || ""}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ==================== ROLES TAB ====================

const ROLE_COLORS = [
  "#99aab5", "#1abc9c", "#2ecc71", "#3498db", "#9b59b6",
  "#e91e63", "#f1c40f", "#e67e22", "#e74c3c", "#95a5a6",
  "#607d8b", "#11806a", "#1f8b4c", "#206694", "#71368a",
  "#ad1457", "#c27c0e", "#a84300", "#992d22", "#979c9f",
];

const ROLE_ICONS = [
  "👑", "⭐", "🛡️", "⚔️", "🎮", "🎨", "🎵", "💎", "🔥", "⚡",
  "🌟", "🏆", "💫", "🎯", "🔮", "🦁", "🐉", "🌸", "🍀", "🎭",
  "🚀", "💡", "🔧", "📌", "🎪", "🌈", "☀️", "🌙", "❄️", "🎃",
];

interface RolesTabProps {
  serverId: string;
  roles: ServerRole[];
  channels: import("@/types").Channel[];
  roleChannelOverrides: import("@/types").RoleChannelOverride[];
  setRoleChannelVisibility: (roleId: string, channelId: string, hidden: boolean) => Promise<void>;
  removeRoleChannelVisibility: (roleId: string, channelId: string) => Promise<void>;
  createRole: (serverId: string, data: { name: string; color: string; icon?: string | null; is_elevated?: boolean; permissions: number }) => Promise<void>;
  updateRole: (roleId: string, serverId: string, data: Partial<ServerRole>) => Promise<void>;
  deleteRole: (roleId: string, serverId: string) => Promise<void>;
}

function RolesTab({ serverId, roles, channels, roleChannelOverrides, setRoleChannelVisibility, removeRoleChannelVisibility, createRole, updateRole, deleteRole }: RolesTabProps) {
  const [editingRole, setEditingRole] = useState<ServerRole | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [roleTab, setRoleTab] = useState<"settings" | "permissions" | "channels">("settings");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Role form state
  const [roleName, setRoleName] = useState("");
  const [roleColor, setRoleColor] = useState("#99aab5");
  const [roleIcon, setRoleIcon] = useState<string | null>(null);
  const [roleElevated, setRoleElevated] = useState(false);
  const [rolePerms, setRolePerms] = useState(0);

  const startCreate = () => {
    setRoleName("");
    setRoleColor("#99aab5");
    setRoleIcon(null);
    setRoleElevated(false);
    setRolePerms(0);
    setRoleTab("settings");
    setIsCreating(true);
    setEditingRole(null);
  };

  const startEdit = (role: ServerRole) => {
    setRoleName(role.name);
    setRoleColor(role.color);
    setRoleIcon(role.icon);
    setRoleElevated(role.is_elevated);
    setRolePerms(role.permissions);
    setRoleTab("settings");
    setEditingRole(role);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!roleName.trim()) return;
    if (isCreating) {
      await createRole(serverId, {
        name: roleName.trim(),
        color: roleColor,
        icon: roleIcon,
        is_elevated: roleElevated,
        permissions: rolePerms,
      });
    } else if (editingRole) {
      await updateRole(editingRole.id, serverId, {
        name: roleName.trim(),
        color: roleColor,
        icon: roleIcon,
        is_elevated: roleElevated,
        permissions: rolePerms,
      });
    }
    setEditingRole(null);
    setIsCreating(false);
  };

  const handleDelete = async () => {
    if (editingRole) {
      await deleteRole(editingRole.id, serverId);
      setEditingRole(null);
      setShowDeleteConfirm(false);
    }
  };

  const togglePerm = (flag: number) => {
    setRolePerms((prev) => prev ^ flag);
  };

  // If editing/creating a role, show the editor
  if (editingRole || isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditingRole(null); setIsCreating(false); }}
            className="p-1 rounded hover:bg-discord-hover text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold text-white">
            {isCreating ? "Create Role" : `Edit Role — ${editingRole?.name}`}
          </h3>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 bg-discord-darker rounded-lg p-1">
          <button
            onClick={() => setRoleTab("settings")}
            className={cn(
              "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              roleTab === "settings"
                ? "bg-discord-brand text-white"
                : "text-gray-400 hover:text-white"
            )}
          >
            Settings
          </button>
          <button
            onClick={() => setRoleTab("permissions")}
            className={cn(
              "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              roleTab === "permissions"
                ? "bg-discord-brand text-white"
                : "text-gray-400 hover:text-white"
            )}
          >
            Permissions
          </button>
          <button
            onClick={() => setRoleTab("channels")}
            className={cn(
              "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              roleTab === "channels"
                ? "bg-discord-brand text-white"
                : "text-gray-400 hover:text-white"
            )}
          >
            Channels
          </button>
        </div>

        {roleTab === "settings" && (
          <div className="space-y-6">
            {/* Role Name */}
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase mb-2">Role Name</Label>
              <Input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="New Role"
              />
            </div>

            {/* Role Icon */}
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase mb-2">Role Icon</Label>
              <p className="text-xs text-gray-500 mb-2">Shows next to the username in chat messages and the member list.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setRoleIcon(null)}
                  className={cn(
                    "w-9 h-9 rounded-lg border-2 flex items-center justify-center text-xs text-gray-400",
                    roleIcon === null ? "border-discord-brand bg-discord-brand/10" : "border-gray-700 hover:border-gray-500"
                  )}
                >
                  ✕
                </button>
                {ROLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setRoleIcon(icon)}
                    className={cn(
                      "w-9 h-9 rounded-lg border-2 flex items-center justify-center text-lg",
                      roleIcon === icon ? "border-discord-brand bg-discord-brand/10" : "border-gray-700 hover:border-gray-500"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Elevated */}
            <div className="bg-discord-darker rounded-lg p-4 border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold text-white">Elevated Role</Label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Members with this role will be shown separately under this role name in the member list.
                  </p>
                </div>
                <Switch checked={roleElevated} onCheckedChange={setRoleElevated} />
              </div>
            </div>

            {/* Role Color */}
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase mb-2">Role Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ROLE_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setRoleColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all border-2",
                      roleColor === color ? "border-white scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="color"
                  value={roleColor}
                  onChange={(e) => setRoleColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                />
                <Input
                  value={roleColor}
                  onChange={(e) => setRoleColor(e.target.value)}
                  className="w-28 font-mono text-sm"
                  placeholder="#99aab5"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="bg-discord-darker rounded-lg p-4 border border-gray-800">
              <Label className="text-xs font-bold text-gray-300 uppercase mb-3">Preview</Label>
              <div className="flex items-center gap-2">
                {roleIcon && <span className="text-lg">{roleIcon}</span>}
                <span className="font-medium" style={{ color: roleColor }}>{roleName || "New Role"}</span>
              </div>
            </div>
          </div>
        )}

        {roleTab === "permissions" && (
          <div className="space-y-2">
            {Object.entries(PERMISSION_LABELS).map(([flag, { name, description }]) => {
              const flagNum = parseInt(flag);
              const isOn = (rolePerms & flagNum) !== 0;
              return (
                <div
                  key={flag}
                  className="flex items-center justify-between bg-discord-darker rounded-lg p-4 border border-gray-800"
                >
                  <div>
                    <Label className="text-sm font-semibold text-white">{name}</Label>
                    <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                  </div>
                  <Switch checked={isOn} onCheckedChange={() => togglePerm(flagNum)} />
                </div>
              );
            })}
          </div>
        )}

        {roleTab === "channels" && (editingRole || isCreating) && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3">
              Choose which channels members with this role can see. Hidden channels will not appear in their channel list.
            </p>
            {isCreating ? (
              <p className="text-sm text-gray-500 italic">Save the role first, then configure channel visibility.</p>
            ) : editingRole && (
              <>
                {channels.length === 0 ? (
                  <p className="text-sm text-gray-500">No channels in this server.</p>
                ) : (
                  channels.map((channel) => {
                    const override = roleChannelOverrides.find(
                      (o) => o.role_id === editingRole.id && o.channel_id === channel.id
                    );
                    const isHidden = override?.hidden || false;
                    return (
                      <div
                        key={channel.id}
                        className="flex items-center justify-between bg-discord-darker rounded-lg px-4 py-3 border border-gray-800"
                      >
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-white">{channel.name}</span>
                          <span className="text-[10px] text-gray-500 uppercase">{channel.type}</span>
                        </div>
                        <button
                          onClick={async () => {
                            if (isHidden) {
                              await removeRoleChannelVisibility(editingRole.id, channel.id);
                            } else {
                              await setRoleChannelVisibility(editingRole.id, channel.id, true);
                            }
                          }}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            isHidden
                              ? "text-red-400 bg-red-400/10 hover:bg-red-400/20"
                              : "text-green-400 bg-green-400/10 hover:bg-green-400/20"
                          )}
                          title={isHidden ? "Hidden — click to make visible" : "Visible — click to hide"}
                        >
                          {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
          <Button onClick={handleSave} disabled={!roleName.trim()}>
            {isCreating ? "Create Role" : "Save Changes"}
          </Button>
          <Button variant="ghost" onClick={() => { setEditingRole(null); setIsCreating(false); }}>
            Cancel
          </Button>
          {editingRole && editingRole.name !== "@everyone" && (
            <Button
              variant="ghost"
              className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-400/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Role
            </Button>
          )}
        </div>

        {/* Delete confirm */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="bg-discord-darker border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Delete Role</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-400">
              Are you sure you want to delete <strong className="text-white">{editingRole?.name}</strong>? Members with this role will lose its permissions.
            </p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Role list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Roles help you organize members and set permissions.
        </p>
        <Button onClick={startCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Role
        </Button>
      </div>

      <div className="space-y-1">
        {roles
          .sort((a, b) => b.position - a.position)
          .map((role) => (
            <button
              key={role.id}
              onClick={() => startEdit(role)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-discord-darker border border-gray-800 hover:border-gray-600 transition-colors group"
            >
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
              {role.icon && <span className="text-lg">{role.icon}</span>}
              <span className="text-white font-medium">{role.name}</span>
              {role.is_elevated && (
                <span className="text-[10px] bg-discord-brand/20 text-discord-brand px-1.5 py-0.5 rounded-full font-medium">
                  ELEVATED
                </span>
              )}
              <Pencil className="w-4 h-4 text-gray-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
      </div>
    </div>
  );
}

// ==================== MEMBERS TAB ====================

interface MembersTabProps {
  serverId: string;
  members: import("@/types").ServerMember[];
  roles: ServerRole[];
  memberRoles: import("@/types").ServerMemberRole[];
  channels: import("@/types").Channel[];
  getMemberRoles: (memberId: string) => ServerRole[];
  getMemberPermissions: (memberId: string) => number;
  assignRole: (serverId: string, memberId: string, roleId: string) => Promise<void>;
  removeRole: (serverId: string, memberId: string, roleId: string) => Promise<void>;
  serverBanUser: (serverId: string, userId: string, reason: string) => Promise<void>;
  serverMuteUser: (serverId: string, userId: string, reason: string, durationDays: number) => Promise<void>;
  serverSuspendUser: (serverId: string, userId: string, reason: string, durationDays: number) => Promise<void>;
  serverUnmuteUser: (serverId: string, muteId: string) => Promise<void>;
  serverUnsuspendUser: (serverId: string, suspensionId: string) => Promise<void>;
  addMemberNote: (serverId: string, userId: string, note: string) => Promise<void>;
  deleteMemberNote: (noteId: string, serverId: string) => Promise<void>;
  setChannelVisibility: (channelId: string, userId: string, hidden: boolean) => Promise<void>;
  removeChannelVisibility: (channelId: string, userId: string) => Promise<void>;
  fetchServerModeration: (serverId: string) => Promise<void>;
  serverMutes: import("@/types").ServerMute[];
  serverSuspensions: import("@/types").ServerSuspension[];
  memberNotes: import("@/types").ServerMemberNote[];
  channelOverrides: import("@/types").ChannelVisibilityOverride[];
  currentUserId: string;
}

function MembersTab(props: MembersTabProps) {
  const {
    serverId, members, roles, channels,
    getMemberRoles, assignRole, removeRole,
    serverBanUser, serverMuteUser, serverSuspendUser, serverUnmuteUser, serverUnsuspendUser,
    addMemberNote, deleteMemberNote, setChannelVisibility, removeChannelVisibility,
    fetchServerModeration, serverMutes, serverSuspensions, memberNotes, channelOverrides,
    currentUserId,
  } = props;

  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<import("@/types").ServerMember | null>(null);

  // Mod action dialogs
  const [showMuteDialog, setShowMuteDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [modReason, setModReason] = useState("");
  const [modDuration, setModDuration] = useState("1");
  const [noteText, setNoteText] = useState("");

  // Fetch moderation data on mount
  useEffect(() => {
    fetchServerModeration(serverId);
  }, [serverId, fetchServerModeration]);

  const filteredMembers = members.filter((m) => {
    if (!search) return true;
    const u = m.user;
    if (!u) return false;
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.display_name.toLowerCase().includes(q)
    );
  });

  const memberUser = selectedMember?.user;
  const selectedMemberRoles = selectedMember ? getMemberRoles(selectedMember.id) : [];
  const selectedMemberMutes = selectedMember
    ? serverMutes.filter((m) => m.user_id === selectedMember.user_id && new Date(m.expires_at) > new Date())
    : [];
  const selectedMemberSuspensions = selectedMember
    ? serverSuspensions.filter((s) => s.user_id === selectedMember.user_id && new Date(s.expires_at) > new Date())
    : [];
  const selectedMemberNotes = selectedMember
    ? memberNotes.filter((n) => n.user_id === selectedMember.user_id)
    : [];
  const selectedMemberOverrides = selectedMember
    ? channelOverrides.filter((o) => o.user_id === selectedMember.user_id)
    : [];

  const handleMute = async () => {
    if (!selectedMember) return;
    await serverMuteUser(serverId, selectedMember.user_id, modReason, parseInt(modDuration) || 1);
    setShowMuteDialog(false);
    setModReason("");
    setModDuration("1");
  };

  const handleSuspend = async () => {
    if (!selectedMember) return;
    await serverSuspendUser(serverId, selectedMember.user_id, modReason, parseInt(modDuration) || 1);
    setShowSuspendDialog(false);
    setModReason("");
    setModDuration("1");
  };

  const handleBan = async () => {
    if (!selectedMember) return;
    await serverBanUser(serverId, selectedMember.user_id, modReason);
    setShowBanDialog(false);
    setModReason("");
    setSelectedMember(null);
  };

  const handleAddNote = async () => {
    if (!selectedMember || !noteText.trim()) return;
    await addMemberNote(serverId, selectedMember.user_id, noteText.trim());
    setShowNoteDialog(false);
    setNoteText("");
  };

  if (selectedMember && memberUser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedMember(null)}
            className="p-1 rounded hover:bg-discord-hover text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={memberUser.avatar_url || undefined} />
            <AvatarFallback>{memberUser.display_name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold text-white">{memberUser.display_name}</h3>
            <p className="text-xs text-gray-400">@{memberUser.username}</p>
          </div>
        </div>

        {/* Roles assignment */}
        <div className="bg-discord-darker rounded-lg p-4 border border-gray-800">
          <Label className="text-xs font-bold text-gray-300 uppercase mb-3">Roles</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {roles.filter((r) => r.name !== "@everyone").map((role) => {
              const hasRole = selectedMemberRoles.some((r) => r.id === role.id);
              return (
                <button
                  key={role.id}
                  onClick={async () => {
                    if (hasRole) {
                      await removeRole(serverId, selectedMember.id, role.id);
                    } else {
                      await assignRole(serverId, selectedMember.id, role.id);
                    }
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all border",
                    hasRole
                      ? "border-transparent text-white"
                      : "border-gray-700 text-gray-400 hover:border-gray-500"
                  )}
                  style={hasRole ? { backgroundColor: role.color + "30", color: role.color, borderColor: role.color } : {}}
                >
                  {role.icon && <span>{role.icon}</span>}
                  {role.name}
                  {hasRole && <X className="w-3 h-3 ml-1" />}
                </button>
              );
            })}
            {roles.filter((r) => r.name !== "@everyone").length === 0 && (
              <p className="text-sm text-gray-500">No custom roles yet.</p>
            )}
          </div>
        </div>

        {/* Active mutes */}
        {selectedMemberMutes.length > 0 && (
          <div className="bg-discord-darker rounded-lg p-4 border border-yellow-800/50">
            <Label className="text-xs font-bold text-yellow-400 uppercase mb-2 flex items-center gap-1.5">
              <VolumeX className="w-3.5 h-3.5" />
              Active Mutes
            </Label>
            <div className="space-y-2 mt-2">
              {selectedMemberMutes.map((mute) => (
                <div key={mute.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-300">{mute.reason || "No reason"}</span>
                    <span className="text-gray-500 ml-2">
                      expires {new Date(mute.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => serverUnmuteUser(serverId, mute.id)} className="text-xs">
                    Unmute
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active suspensions */}
        {selectedMemberSuspensions.length > 0 && (
          <div className="bg-discord-darker rounded-lg p-4 border border-orange-800/50">
            <Label className="text-xs font-bold text-orange-400 uppercase mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Active Suspensions
            </Label>
            <div className="space-y-2 mt-2">
              {selectedMemberSuspensions.map((suspension) => (
                <div key={suspension.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-300">{suspension.reason || "No reason"}</span>
                    <span className="text-gray-500 ml-2">
                      expires {new Date(suspension.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => serverUnsuspendUser(serverId, suspension.id)} className="text-xs">
                    Unsuspend
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-discord-darker rounded-lg p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-bold text-gray-300 uppercase flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" />
              Moderator Notes
            </Label>
            <Button variant="ghost" size="sm" onClick={() => { setNoteText(""); setShowNoteDialog(true); }} className="gap-1">
              <Plus className="w-3 h-3" />
              Add
            </Button>
          </div>
          {selectedMemberNotes.length === 0 ? (
            <p className="text-sm text-gray-500">No notes yet.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {selectedMemberNotes.map((note) => (
                <div key={note.id} className="flex items-start justify-between bg-discord-dark rounded-lg p-3">
                  <div>
                    <p className="text-sm text-gray-300">{note.note}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(note.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteMemberNote(note.id, serverId)} className="text-red-400 hover:text-red-300 p-1 h-auto">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Channel visibility */}
        <div className="bg-discord-darker rounded-lg p-4 border border-gray-800">
          <Label className="text-xs font-bold text-gray-300 uppercase mb-3 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            Channel Visibility
          </Label>
          <p className="text-xs text-gray-500 mb-3">Toggle which channels this member can see.</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {channels.map((channel) => {
              const override = selectedMemberOverrides.find((o) => o.channel_id === channel.id);
              const isHidden = override?.hidden || false;
              return (
                <div key={channel.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-discord-dark">
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="w-3.5 h-3.5 text-gray-500" />
                    <span className={cn("text-gray-300", isHidden && "line-through text-gray-500")}>{channel.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (isHidden) {
                        removeChannelVisibility(channel.id, selectedMember.user_id);
                      } else {
                        setChannelVisibility(channel.id, selectedMember.user_id, true);
                      }
                    }}
                    className={cn(
                      "p-1 rounded transition-colors",
                      isHidden ? "text-red-400 hover:text-red-300" : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Moderation actions */}
        {selectedMember.user_id !== currentUserId && (
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-300 uppercase">Moderation Actions</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                className="gap-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10"
                onClick={() => { setModReason(""); setModDuration("1"); setShowMuteDialog(true); }}
              >
                <VolumeX className="w-4 h-4" />
                Mute
              </Button>
              <Button
                variant="ghost"
                className="gap-2 text-orange-400 hover:text-orange-300 hover:bg-orange-400/10"
                onClick={() => { setModReason(""); setModDuration("1"); setShowSuspendDialog(true); }}
              >
                <Clock className="w-4 h-4" />
                Suspend
              </Button>
              <Button
                variant="ghost"
                className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                onClick={() => { setModReason(""); setShowBanDialog(true); }}
              >
                <Ban className="w-4 h-4" />
                Ban
              </Button>
            </div>
          </div>
        )}

        {/* Mute Dialog */}
        <Dialog open={showMuteDialog} onOpenChange={setShowMuteDialog}>
          <DialogContent className="bg-discord-darker border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Mute {memberUser.display_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-gray-300 uppercase mb-1">Reason</Label>
                <Input value={modReason} onChange={(e) => setModReason(e.target.value)} placeholder="Reason for mute..." />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-300 uppercase mb-1">Duration (days)</Label>
                <Input type="number" value={modDuration} onChange={(e) => setModDuration(e.target.value)} min="1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowMuteDialog(false)}>Cancel</Button>
              <Button className="bg-yellow-600 hover:bg-yellow-700" onClick={handleMute}>Mute</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Suspend Dialog */}
        <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
          <DialogContent className="bg-discord-darker border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Suspend {memberUser.display_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-gray-300 uppercase mb-1">Reason</Label>
                <Input value={modReason} onChange={(e) => setModReason(e.target.value)} placeholder="Reason for suspension..." />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-300 uppercase mb-1">Duration (days)</Label>
                <Input type="number" value={modDuration} onChange={(e) => setModDuration(e.target.value)} min="1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowSuspendDialog(false)}>Cancel</Button>
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleSuspend}>Suspend</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ban Dialog */}
        <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
          <DialogContent className="bg-discord-darker border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Ban {memberUser.display_name}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-400">This will immediately remove the user from the server. They will not be able to rejoin until unbanned.</p>
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase mb-1">Reason</Label>
              <Input value={modReason} onChange={(e) => setModReason(e.target.value)} placeholder="Reason for ban..." />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowBanDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleBan}>Ban</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Note Dialog */}
        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent className="bg-discord-darker border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Add Note for {memberUser.display_name}</DialogTitle>
            </DialogHeader>
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase mb-1">Note</Label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write a moderator note..."
                className="min-h-[80px] resize-none"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
              <Button onClick={handleAddNote} disabled={!noteText.trim()}>Save Note</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Member list view
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="pl-10"
        />
      </div>

      <p className="text-xs text-gray-500">{filteredMembers.length} members</p>

      {/* Member list */}
      <div className="space-y-1">
        {filteredMembers.map((member) => {
          const memberUser = member.user;
          if (!memberUser) return null;
          const mRoles = getMemberRoles(member.id);
          const activeMute = serverMutes.find((m) => m.user_id === member.user_id && new Date(m.expires_at) > new Date());
          const activeSuspension = serverSuspensions.find((s) => s.user_id === member.user_id && new Date(s.expires_at) > new Date());

          return (
            <button
              key={member.id}
              onClick={() => setSelectedMember(member)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-discord-darker transition-colors group"
            >
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={memberUser.avatar_url || undefined} />
                <AvatarFallback className="text-sm">{memberUser.display_name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white font-medium truncate">{memberUser.display_name}</span>
                  <span className="text-xs text-gray-500">@{memberUser.username}</span>
                </div>
                {mRoles.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    {mRoles.map((r) => (
                      <span key={r.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: r.color + "30", color: r.color }}>
                        {r.icon && <span className="mr-0.5">{r.icon}</span>}{r.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {activeMute && (
                  <span className="text-yellow-400" title="Muted"><VolumeX className="w-4 h-4" /></span>
                )}
                {activeSuspension && (
                  <span className="text-orange-400" title="Suspended"><Clock className="w-4 h-4" /></span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
