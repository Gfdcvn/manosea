"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useServerStore } from "@/stores/server-store";
import { useAuthStore } from "@/stores/auth-store";
import { ChannelSidebar } from "@/components/layout/channel-sidebar";
import { UserPanel } from "@/components/layout/user-panel";
import { ServerSettings } from "@/components/server-settings";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, Settings, UserPlus, Trash2, Copy, Check, RefreshCw, LogOut } from "lucide-react";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";
import { hasPermission, PERMISSIONS } from "@/types";

export default function ServerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const serverId = params.serverId as string;
  const { servers, setCurrentServer, fetchServerDetails, fetchServers, fetchServerModeration } = useServerStore();
  const user = useAuthStore((s) => s.user);

  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (serverId && serverId !== "me") {
      const server = servers.find((s) => s.id === serverId);
      if (server) {
        setCurrentServer(server);
        fetchServerDetails(serverId);
        fetchServerModeration(serverId);
        
        // Check for server ban or suspension
        if (user) {
          const supabase = createClient();
          // Check ban
          supabase
            .from("server_bans")
            .select("id")
            .eq("server_id", serverId)
            .eq("user_id", user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                router.replace("/channels/me");
              }
            });
          // Check suspension
          supabase
            .from("server_suspensions")
            .select("id")
            .eq("server_id", serverId)
            .eq("user_id", user.id)
            .gte("expires_at", new Date().toISOString())
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                router.replace(`/server-suspended?server=${serverId}`);
              }
            });
        }
      }
    }

    return () => setCurrentServer(null);
  }, [serverId, servers, setCurrentServer, fetchServerDetails, fetchServerModeration, user, router]);

  const currentServer = useServerStore((s) => s.currentServer);
  const members = useServerStore((s) => s.members);
  const getMemberPermissions = useServerStore((s) => s.getMemberPermissions);
  const isOwner = currentServer && user && currentServer.owner_id === user.id;
  
  // Find current user's member record and permissions
  const currentMember = members.find((m) => m.user_id === user?.id);
  const myPerms = currentMember ? getMemberPermissions(currentMember.id) : 0;
  const canManageServer = isOwner || hasPermission(myPerms, PERMISSIONS.EDIT_SETTINGS);
  const canInvite = isOwner || hasPermission(myPerms, PERMISSIONS.INVITE_PEOPLE);

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteExpiry, setInviteExpiry] = useState("7");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const handleCreateInvite = () => {
    setInviteCode("");
    setInviteCopied(false);
    setInviteExpiry("7");
    setInviteLoading(false);
    setShowInviteDialog(true);
  };

  const generateInvite = async () => {
    setInviteLoading(true);
    setInviteCopied(false);
    const supabase = createClient();
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

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const handleLeaveServer = async () => {
    if (!user) return;
    const supabase = createClient();
    await supabase
      .from("server_members")
      .delete()
      .eq("server_id", serverId)
      .eq("user_id", user.id);
    await fetchServers();
    router.push("/channels/me");
  };

  const handleDeleteServer = async () => {
    const supabase = createClient();
    await supabase.from("servers").delete().eq("id", serverId);
    await fetchServers();
    router.push("/channels/me");
  };

  if (!currentServer) {
    return (
      <div className="flex-1 flex items-center justify-center bg-discord-chat">
        <div className="animate-pulse text-discord-muted">Loading server...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <div className="w-60 bg-discord-channel flex flex-col">
        {/* Banner color strip */}
        {currentServer.banner_color && (
          <div className="h-1.5 shrink-0" style={{ backgroundColor: currentServer.banner_color }} />
        )}
        {/* Server Header with Settings Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-12 border-b border-gray-800 flex items-center justify-between px-4 shadow-sm w-full hover:bg-discord-hover transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-white font-semibold truncate">{currentServer.name}</h2>
                {currentServer.tag && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-discord-brand/20 text-discord-brand font-medium shrink-0 uppercase">
                    {currentServer.tag}
                  </span>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            {canInvite && (
              <DropdownMenuItem onClick={handleCreateInvite}>
                <UserPlus className="w-4 h-4 mr-2 text-discord-brand" />
                <span className="text-discord-brand">Invite People</span>
              </DropdownMenuItem>
            )}
            {canManageServer && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Server Settings
                </DropdownMenuItem>
              </>
            )}
            {isOwner ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  destructive
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Server
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowLeaveConfirm(true)}
                  destructive
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave Server
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ChannelSidebar serverId={serverId} />
        <UserPanel />
      </div>
      <div className="flex-1 flex flex-col">{children}</div>

      {/* Full-page Server Settings */}
      {showSettings && (
        <ServerSettings serverId={serverId} onClose={() => setShowSettings(false)} />
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-discord-darker border-gray-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Server Invite</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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

      {/* Leave Confirm Dialog */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Server</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            Are you sure you want to leave <strong className="text-white">{currentServer.name}</strong>? You won{"'"} be able to rejoin unless you are re-invited.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setShowLeaveConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLeaveServer}>
              Leave Server
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Server</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            Are you sure you want to delete <strong className="text-white">{currentServer.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteServer}>
              Delete Server
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
