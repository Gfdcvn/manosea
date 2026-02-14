"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminStore } from "@/stores/admin-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Users, Hash, Eye, Award, X, Plus } from "lucide-react";
import { ServerBadge } from "@/types";

interface ServerInfo {
  id: string;
  name: string;
  icon_url: string | null;
  owner_id: string;
  is_suspended: boolean;
  created_at: string;
  member_count: number;
  channel_count: number;
  owner?: { display_name: string; username: string };
}

export default function AdminServersPage() {
  const { badges, fetchAllBadges, assignBadgeToServer, removeBadgeFromServer } = useAdminStore();
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Detail dialog state
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null);
  const [serverBadges, setServerBadges] = useState<ServerBadge[]>([]);
  const [showAssignBadge, setShowAssignBadge] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState("");

  useEffect(() => {
    fetchServers();
    fetchAllBadges();
  }, [fetchAllBadges]);

  const fetchServers = async () => {
    const supabase = createClient();

    const { data: serverData } = await supabase
      .from("servers")
      .select("*, owner:users!servers_owner_id_fkey(display_name, username)")
      .order("created_at", { ascending: false });

    if (serverData) {
      const withCounts = await Promise.all(
        serverData.map(async (s) => {
          const [{ count: members }, { count: channels }] = await Promise.all([
            supabase.from("server_members").select("*", { count: "exact", head: true }).eq("server_id", s.id),
            supabase.from("channels").select("*", { count: "exact", head: true }).eq("server_id", s.id),
          ]);
          return {
            ...s,
            member_count: members || 0,
            channel_count: channels || 0,
          };
        })
      );
      setServers(withCounts);
    }
    setLoading(false);
  };

  const toggleSuspend = async (serverId: string, currentState: boolean) => {
    const supabase = createClient();
    await supabase.from("servers").update({ is_suspended: !currentState }).eq("id", serverId);
    fetchServers();
  };

  const openServerDetail = async (server: ServerInfo) => {
    setSelectedServer(server);
    await fetchServerBadges(server.id);
  };

  const fetchServerBadges = async (serverId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("server_badges")
      .select("*, badge:badges(*)")
      .eq("server_id", serverId);
    setServerBadges((data as ServerBadge[]) || []);
  };

  const handleAssignBadge = async () => {
    if (!selectedServer || !selectedBadgeId) return;
    await assignBadgeToServer(selectedServer.id, selectedBadgeId);
    await fetchServerBadges(selectedServer.id);
    setShowAssignBadge(false);
    setSelectedBadgeId("");
  };

  const handleRemoveBadge = async (badgeId: string) => {
    if (!selectedServer) return;
    await removeBadgeFromServer(selectedServer.id, badgeId);
    await fetchServerBadges(selectedServer.id);
  };

  const availableBadges = badges.filter(
    (b) => !serverBadges.some((sb) => sb.badge_id === b.id)
  );

  const filtered = servers.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Server Management</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search servers..."
          className="pl-10"
        />
      </div>

      <div className="bg-discord-dark rounded-lg border border-gray-800">
        <div className="grid grid-cols-[1fr_150px_80px_80px_100px_120px] gap-4 p-4 border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase">
          <span>Server</span>
          <span>Owner</span>
          <span>Members</span>
          <span>Channels</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        <ScrollArea className="max-h-[600px]">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading servers...</div>
          ) : (
            filtered.map((server) => (
              <div
                key={server.id}
                className="grid grid-cols-[1fr_150px_80px_80px_100px_120px] gap-4 p-4 border-b border-gray-800/50 items-center hover:bg-discord-hover/50 cursor-pointer"
                onClick={() => openServerDetail(server)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={server.icon_url || undefined} />
                    <AvatarFallback className="text-xs bg-discord-brand">
                      {server.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-white truncate">{server.name}</span>
                </div>

                <span className="text-xs text-gray-400 truncate">
                  {server.owner?.display_name || "Unknown"}
                </span>

                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Users className="w-3 h-3" />
                  {server.member_count}
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Hash className="w-3 h-3" />
                  {server.channel_count}
                </div>

                <span className={`text-xs font-medium ${server.is_suspended ? "text-red-400" : "text-green-400"}`}>
                  {server.is_suspended ? "Suspended" : "Active"}
                </span>

                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openServerDetail(server)}
                    className="p-1.5 rounded hover:bg-discord-hover text-gray-400 hover:text-discord-brand"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleSuspend(server.id, server.is_suspended)}
                    className={`text-xs px-2 py-1 rounded ${
                      server.is_suspended
                        ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                        : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    }`}
                  >
                    {server.is_suspended ? "Unsuspend" : "Suspend"}
                  </button>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Server Detail Dialog */}
      <Dialog open={!!selectedServer} onOpenChange={(open) => { if (!open) setSelectedServer(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedServer && (
            <>
              <DialogHeader>
                <DialogTitle>Server Details</DialogTitle>
              </DialogHeader>

              {/* Server Header */}
              <div className="flex items-start gap-4 p-4 bg-discord-darker rounded-lg">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedServer.icon_url || undefined} />
                  <AvatarFallback className="text-xl bg-discord-brand">
                    {selectedServer.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white">{selectedServer.name}</h3>
                  <p className="text-sm text-gray-400">
                    Owner: {selectedServer.owner?.display_name || "Unknown"}{" "}
                    <span className="text-gray-500">(@{selectedServer.owner?.username})</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">ID: {selectedServer.id}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded shrink-0 ${
                  selectedServer.is_suspended
                    ? "bg-red-500/20 text-red-400"
                    : "bg-green-500/20 text-green-400"
                }`}>
                  {selectedServer.is_suspended ? "Suspended" : "Active"}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-discord-darker rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Members</p>
                  <p className="text-lg font-bold text-white mt-1">{selectedServer.member_count}</p>
                </div>
                <div className="bg-discord-darker rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Channels</p>
                  <p className="text-lg font-bold text-white mt-1">{selectedServer.channel_count}</p>
                </div>
                <div className="bg-discord-darker rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Created</p>
                  <p className="text-sm text-gray-300 mt-1">
                    {new Date(selectedServer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Server Badges Section */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-discord-brand" />
                    <h4 className="text-sm font-semibold text-white">Badges ({serverBadges.length})</h4>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setShowAssignBadge(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Assign Badge
                  </Button>
                </div>

                {serverBadges.length === 0 ? (
                  <p className="text-xs text-gray-500">No badges assigned to this server.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {serverBadges.map((sb) => (
                      <div
                        key={sb.id}
                        className="flex items-center gap-2 bg-discord-darker rounded-full px-3 py-1.5 border border-gray-700 group"
                      >
                        <span className="text-sm">{sb.badge?.icon}</span>
                        <span className="text-xs text-gray-300">{sb.badge?.name}</span>
                        <button
                          onClick={() => handleRemoveBadge(sb.badge_id)}
                          className="p-0.5 rounded-full hover:bg-red-500/20 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove badge"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                <Button
                  size="sm"
                  variant={selectedServer.is_suspended ? "default" : "destructive"}
                  onClick={() => {
                    toggleSuspend(selectedServer.id, selectedServer.is_suspended);
                    setSelectedServer({
                      ...selectedServer,
                      is_suspended: !selectedServer.is_suspended,
                    });
                  }}
                >
                  {selectedServer.is_suspended ? "Unsuspend Server" : "Suspend Server"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Badge to Server Dialog */}
      <Dialog open={showAssignBadge} onOpenChange={setShowAssignBadge}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Badge to {selectedServer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {availableBadges.length === 0 ? (
              <p className="text-sm text-gray-400">No available badges to assign.</p>
            ) : (
              <>
                <div>
                  <Label className="text-xs font-bold text-gray-300 uppercase">Select Badge</Label>
                  <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a badge..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBadges.map((badge) => (
                        <SelectItem key={badge.id} value={badge.id}>
                          <span className="flex items-center gap-2">
                            <span>{badge.icon}</span>
                            <span>{badge.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setShowAssignBadge(false)}>Cancel</Button>
                  <Button onClick={handleAssignBadge} disabled={!selectedBadgeId}>Assign Badge</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
