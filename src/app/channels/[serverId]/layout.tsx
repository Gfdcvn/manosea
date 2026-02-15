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
import { ChevronDown, Settings, UserPlus, Trash2 } from "lucide-react";
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

  const handleCreateInvite = async () => {
    const supabase = createClient();
    if (!user) return;
    const code = generateInviteCode();
    await supabase.from("server_invites").insert({
      server_id: serverId,
      code,
      created_by: user.id,
    });
    navigator.clipboard.writeText(code);
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
            {isOwner && (
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
