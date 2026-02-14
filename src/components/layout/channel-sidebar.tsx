"use client";

import { useRouter, usePathname } from "next/navigation";
import { useServerStore } from "@/stores/server-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Hash, Volume2, ChevronDown, Plus, Copy, Check, RefreshCw } from "lucide-react";
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

interface ChannelSidebarProps {
  serverId: string;
}

export function ChannelSidebar({ serverId }: ChannelSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { channels, categories, createChannel, createCategory } = useServerStore();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [createDialog, setCreateDialog] = useState<{
    type: "text" | "voice" | "category";
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

  const openCreateDialog = (type: "text" | "voice" | "category") => {
    setChannelName("");
    setCreateDialog({ type, open: true });
  };

  const handleCreate = async () => {
    const name = channelName.trim();
    if (!name) return;
    if (createDialog.type === "category") {
      await createCategory(serverId, name);
    } else {
      await createChannel(serverId, name.toLowerCase().replace(/\s+/g, "-"), createDialog.type);
    }
    setCreateDialog({ ...createDialog, open: false });
    setChannelName("");
  };

  // Group channels by category
  const uncategorized = channels.filter((c) => !c.category_id);
  const categorizedChannels = categories.map((cat) => ({
    category: cat,
    channels: channels.filter((c) => c.category_id === cat.id),
  }));

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
            <DropdownMenuItem onClick={() => openCreateDialog("text")}>
              <Hash className="w-4 h-4 mr-2" />
              Create Text Channel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openCreateDialog("voice")}>
              <Volume2 className="w-4 h-4 mr-2" />
              Create Voice Channel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openCreateDialog("category")}>
              Create Category
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateInvite}>
              Create Invite
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Uncategorized channels */}
        <div className="mt-1 space-y-0.5">
          {uncategorized.map((channel) => (
            <ChannelButton
              key={channel.id}
              channel={channel}
              isActive={pathname?.includes(channel.id) || false}
              onClick={() => router.push(`/channels/${serverId}/${channel.id}`)}
            />
          ))}
        </div>

        {/* Categorized channels */}
        {categorizedChannels.map(({ category, channels: catChannels }) => (
          <div key={category.id} className="mt-4">
            <button
              onClick={() => toggleCategory(category.id)}
              className="flex items-center gap-0.5 px-0.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 w-full"
            >
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform",
                  collapsedCategories.has(category.id) && "-rotate-90"
                )}
              />
              {category.name}
            </button>
            {!collapsedCategories.has(category.id) && (
              <div className="mt-1 space-y-0.5">
                {catChannels.map((channel) => (
                  <ChannelButton
                    key={channel.id}
                    channel={channel}
                    isActive={pathname?.includes(channel.id) || false}
                    onClick={() => router.push(`/channels/${serverId}/${channel.id}`)}
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
}: {
  channel: { type: string; name: string };
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors group",
        isActive
          ? "bg-discord-active text-white"
          : "text-gray-400 hover:text-gray-200 hover:bg-discord-hover"
      )}
    >
      {channel.type === "voice" ? (
        <Volume2 className="w-4 h-4 shrink-0" />
      ) : (
        <Hash className="w-4 h-4 shrink-0" />
      )}
      <span className="truncate">{channel.name}</span>
    </button>
  );
}
