"use client";

import { useRouter, usePathname } from "next/navigation";
import { useServerStore } from "@/stores/server-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Hash, Volume2, ChevronDown, Plus, Copy, Check, RefreshCw, Settings, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { Channel, PERMISSIONS, hasPermission } from "@/types";
import { useNotificationStore } from "@/stores/notification-store";

interface ChannelSidebarProps {
  serverId: string;
}

export function ChannelSidebar({ serverId }: ChannelSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { channels, categories, createChannel, createCategory, renameChannel, deleteChannel, moveChannel, currentServer, getMemberPermissions, channelOverrides, members } = useServerStore();
  const user = useAuthStore((s) => s.user);
  const isOwner = currentServer && user && currentServer.owner_id === user.id;
  const currentMember = members.find((m) => m.user_id === user?.id);
  const myPerms = currentMember ? getMemberPermissions(currentMember.id) : 0;
  const canCreateChannels = isOwner || hasPermission(myPerms, PERMISSIONS.CREATE_CHANNELS) || hasPermission(myPerms, PERMISSIONS.IS_ADMIN);
  const canCreateCategories = isOwner || hasPermission(myPerms, PERMISSIONS.CREATE_CATEGORIES) || hasPermission(myPerms, PERMISSIONS.IS_ADMIN);
  const canInvite = isOwner || hasPermission(myPerms, PERMISSIONS.INVITE_PEOPLE) || hasPermission(myPerms, PERMISSIONS.IS_ADMIN);
  const canManageChannels = isOwner || hasPermission(myPerms, PERMISSIONS.IS_ADMIN);
  const serverMentions = useNotificationStore((s) => s.serverMentions);
  const clearChannelMention = useNotificationStore((s) => s.clearChannelMention);
  const mentionedChannels = serverMentions[serverId] || new Set<string>();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [createDialog, setCreateDialog] = useState<{
    type: "text" | "voice" | "category";
    categoryId?: string;
    open: boolean;
  }>({ type: "text", open: false });
  const [channelName, setChannelName] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteExpiry, setInviteExpiry] = useState("7");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const generateInvite = async () => {
    setInviteLoading(true);
    setInviteCopied(false);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInviteLoading(false); return; }

    const code = generateInviteCode();
    const expiryDays = parseInt(inviteExpiry);
    const expiresAt = expiryDays > 0
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await supabase.from("server_invites").insert({
      server_id: serverId,
      code,
      created_by: user.id,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
    });

    setInviteCode(code);
    setInviteLoading(false);
  };

  const handleCreateInvite = async () => {
    setInviteCode("");
    setInviteCopied(false);
    setInviteExpiry("7");
    setShowInviteDialog(true);
    // Auto-generate one
    setInviteLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInviteLoading(false); return; }

    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("server_invites").insert({
      server_id: serverId,
      code,
      created_by: user.id,
      expires_at: expiresAt,
    });
    setInviteCode(code);
    setInviteLoading(false);
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const openCreateDialog = (type: "text" | "voice" | "category", categoryId?: string) => {
    setChannelName("");
    setCreateDialog({ type, categoryId, open: true });
  };

  const handleCreate = async () => {
    const name = channelName.trim();
    if (!name) return;
    if (createDialog.type === "category") {
      await createCategory(serverId, name);
    } else {
      await createChannel(serverId, name.toLowerCase().replace(/\s+/g, "-"), createDialog.type, createDialog.categoryId);
    }
    setCreateDialog({ ...createDialog, open: false });
    setChannelName("");
  };

  // Filter channels by visibility overrides
  const visibleChannels = user ? channels.filter((c) => {
    const override = channelOverrides.find((o) => o.channel_id === c.id && o.user_id === user.id);
    return !override || !override.hidden;
  }) : channels;

  // Group channels by category
  const uncategorized = visibleChannels.filter((c) => !c.category_id);
  const categorizedChannels = categories.map((cat) => ({
    category: cat,
    channels: visibleChannels.filter((c) => c.category_id === cat.id),
  }));

  // Drag and drop
  const [draggedChannelId, setDraggedChannelId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const handleDragStart = (channelId: string) => {
    setDraggedChannelId(channelId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverTarget(targetId);
  };

  const handleDrop = async (e: React.DragEvent, categoryId: string | null) => {
    e.preventDefault();
    if (draggedChannelId && canManageChannels) {
      await moveChannel(draggedChannelId, categoryId, serverId);
    }
    setDraggedChannelId(null);
    setDragOverTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedChannelId(null);
    setDragOverTarget(null);
  };

  return (
    <ScrollArea className="flex-1">
      <div className="px-2 py-2">
        {/* Server actions */}
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full text-left px-2 py-1 rounded hover:bg-discord-hover text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between group">
            <span>Channels</span>
            <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {canCreateChannels && (
              <>
                <DropdownMenuItem onClick={() => openCreateDialog("text")}>
                  <Hash className="w-4 h-4 mr-2" />
                  Create Text Channel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreateDialog("voice")}>
                  <Volume2 className="w-4 h-4 mr-2" />
                  Create Voice Channel
                </DropdownMenuItem>
              </>
            )}
            {canCreateCategories && (
              <DropdownMenuItem onClick={() => openCreateDialog("category")}>
                Create Category
              </DropdownMenuItem>
            )}
            {(canCreateChannels || canCreateCategories) && canInvite && <DropdownMenuSeparator />}
            {canInvite && (
              <DropdownMenuItem onClick={handleCreateInvite}>
                Create Invite
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Uncategorized channels */}
        <div
          className={cn("mt-1 space-y-0.5 min-h-[8px] rounded transition-colors", dragOverTarget === "uncategorized" && "bg-discord-brand/10")}
          onDragOver={(e) => handleDragOver(e, "uncategorized")}
          onDragLeave={() => setDragOverTarget(null)}
          onDrop={(e) => handleDrop(e, null)}
        >
          {uncategorized.map((channel) => (
            <ChannelButton
              key={channel.id}
              channel={channel}
              isActive={pathname?.includes(channel.id) || false}
              onClick={() => {
                clearChannelMention(serverId, channel.id);
                router.push(`/channels/${serverId}/${channel.id}`);
              }}
              isOwner={!!canManageChannels}
              onRename={(newName) => renameChannel(channel.id, newName, serverId)}
              onDelete={() => deleteChannel(channel.id, serverId)}
              onDragStart={() => handleDragStart(channel.id)}
              onDragEnd={handleDragEnd}
              isDragging={draggedChannelId === channel.id}
              hasMention={mentionedChannels.has(channel.id)}
            />
          ))}
        </div>

        {/* Categorized channels */}
        {categorizedChannels.map(({ category, channels: catChannels }) => (
          <div key={category.id} className="mt-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex items-center gap-0.5 px-0.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 flex-1"
              >
                <ChevronDown
                  className={cn(
                    "w-3 h-3 transition-transform",
                    collapsedCategories.has(category.id) && "-rotate-90"
                  )}
                />
                {category.name}
              </button>
              {canCreateChannels && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-all"
                      onClick={(e) => e.stopPropagation()}
                      title="Add channel to category"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openCreateDialog("text", category.id)}>
                      <Hash className="w-4 h-4 mr-2" />
                      Text Channel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openCreateDialog("voice", category.id)}>
                      <Volume2 className="w-4 h-4 mr-2" />
                      Voice Channel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {!collapsedCategories.has(category.id) && (
              <div
                className={cn("mt-1 space-y-0.5 min-h-[8px] rounded transition-colors", dragOverTarget === category.id && "bg-discord-brand/10")}
                onDragOver={(e) => handleDragOver(e, category.id)}
                onDragLeave={() => setDragOverTarget(null)}
                onDrop={(e) => handleDrop(e, category.id)}
              >
                {catChannels.map((channel) => (
                  <ChannelButton
                    key={channel.id}
                    channel={channel}
                    isActive={pathname?.includes(channel.id) || false}
                    onClick={() => {
                      clearChannelMention(serverId, channel.id);
                      router.push(`/channels/${serverId}/${channel.id}`);
                    }}
                    isOwner={!!canManageChannels}
                    onRename={(newName) => renameChannel(channel.id, newName, serverId)}
                    onDelete={() => deleteChannel(channel.id, serverId)}
                    onDragStart={() => handleDragStart(channel.id)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedChannelId === channel.id}
                    hasMention={mentionedChannels.has(channel.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-discord-darker border-gray-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Server Invite</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Invite code display */}
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase mb-2">
                Invite Code
              </Label>
              {inviteLoading ? (
                <div className="bg-discord-dark rounded-lg px-4 py-3 text-sm text-gray-400 animate-pulse">
                  Generating...
                </div>
              ) : inviteCode ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-discord-dark rounded-lg px-4 py-3 text-white font-mono text-sm select-all">
                    {inviteCode}
                  </div>
                  <Button
                    onClick={handleCopyInvite}
                    variant="ghost"
                    className="shrink-0 px-3"
                  >
                    {inviteCopied ? (
                      <Check className="w-4 h-4 text-discord-green" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ) : null}
              {inviteCopied && (
                <p className="text-xs text-discord-green mt-1">Copied to clipboard!</p>
              )}
            </div>

            {/* Expiry selector */}
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase mb-2">
                Expire After
              </Label>
              <select
                value={inviteExpiry}
                onChange={(e) => setInviteExpiry(e.target.value)}
                className="w-full bg-discord-dark border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-discord-brand"
              >
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="0">Never</option>
              </select>
            </div>

            {/* Generate new button */}
            <Button
              onClick={generateInvite}
              variant="ghost"
              className="w-full gap-2"
              disabled={inviteLoading}
            >
              <RefreshCw className={`w-4 h-4 ${inviteLoading ? "animate-spin" : ""}`} />
              Generate New Invite
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Channel/Category Dialog */}
      <Dialog
        open={createDialog.open}
        onOpenChange={(open) => setCreateDialog({ ...createDialog, open })}
      >
        <DialogContent className="bg-discord-darker border-gray-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {createDialog.type === "category"
                ? "Create Category"
                : createDialog.type === "voice"
                ? "Create Voice Channel"
                : "Create Text Channel"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs font-bold text-gray-300 uppercase">
              {createDialog.type === "category" ? "Category Name" : "Channel Name"}
            </Label>
            <Input
              placeholder={
                createDialog.type === "category"
                  ? "new-category"
                  : createDialog.type === "voice"
                  ? "General"
                  : "new-channel"
              }
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              autoFocus
            />
            {createDialog.type !== "category" && (
              <p className="text-xs text-gray-500">
                Channel names are automatically lowercased and spaces become hyphens.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateDialog({ ...createDialog, open: false })}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!channelName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

function ChannelButton({
  channel,
  isActive,
  onClick,
  isOwner,
  onRename,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging,
  hasMention,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
  isOwner: boolean;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  hasMention?: boolean;
}) {
  const [showRename, setShowRename] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newName, setNewName] = useState(channel.name);

  const handleRename = () => {
    const name = newName.trim();
    if (!name || name === channel.name) { setShowRename(false); return; }
    onRename(channel.type === "voice" ? name : name.toLowerCase().replace(/\s+/g, "-"));
    setShowRename(false);
  };

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div
        draggable={isOwner}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          onDragStart?.();
        }}
        onDragEnd={onDragEnd}
        className={cn(
          "w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors group",
          isActive
            ? "bg-discord-active text-white"
            : "text-gray-400 hover:text-gray-200 hover:bg-discord-hover",
          isDragging && "opacity-40",
          isOwner && "cursor-grab active:cursor-grabbing"
        )}
      >
        <button onClick={onClick} className="flex items-center gap-1.5 flex-1 min-w-0">
          {channel.type === "voice" ? (
            <Volume2 className="w-4 h-4 shrink-0" />
          ) : (
            <Hash className="w-4 h-4 shrink-0" />
          )}
          <span className={cn("truncate", hasMention && !isActive && "text-white font-semibold")}>{channel.name}</span>
          {hasMention && !isActive && (
            <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 ml-auto" />
          )}
        </button>
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition-all shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => { setNewName(channel.name); setShowRename(true); }}>
                <Pencil className="w-4 h-4 mr-2" />
                Rename Channel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-red-400 focus:text-red-400">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent className="bg-discord-darker border-gray-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Rename Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs font-bold text-gray-300 uppercase">Channel Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRename(false)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-discord-darker border-gray-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Channel</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            Are you sure you want to delete <strong className="text-white">#{channel.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
