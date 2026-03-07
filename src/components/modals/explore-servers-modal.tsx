"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useServerStore } from "@/stores/server-store";
import { useAuthStore } from "@/stores/auth-store";
import { useMessageStore } from "@/stores/message-store";
import { Server, Bot } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search, Users, Compass, Check, Bot as BotIcon, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ExploreServersModalProps {
  open: boolean;
  onClose: () => void;
}

interface DiscoverableServer extends Server {
  member_count: number;
}

export function ExploreServersModal({ open, onClose }: ExploreServersModalProps) {
  const [servers, setServers] = useState<DiscoverableServer[]>([]);
  const [publicBots, setPublicBots] = useState<(Bot & { owner_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"servers" | "bots">("servers");
  const [botInvite, setBotInvite] = useState<Bot | null>(null);
  const [botInvitingServerId, setBotInvitingServerId] = useState<string | null>(null);
  const [botInvitedServerIds, setBotInvitedServerIds] = useState<Set<string>>(new Set());
  const { fetchServers, servers: myServers } = useServerStore();
  const createDmChannel = useMessageStore((s) => s.createDmChannel);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    loadServers();
    loadBots();
  }, [open]);

  // Track which servers the user is already in
  useEffect(() => {
    const ids = new Set(myServers.map((s) => s.id));
    setJoinedIds(ids);
  }, [myServers]);

  const loadServers = async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch all discoverable servers
    const { data: discoverableServers } = await supabase
      .from("servers")
      .select("*")
      .eq("is_discoverable", true)
      .eq("is_suspended", false)
      .order("created_at", { ascending: false });

    if (!discoverableServers) {
      setServers([]);
      setLoading(false);
      return;
    }

    // Fetch member counts for each server
    const serverIds = discoverableServers.map((s) => s.id);
    const { data: memberCounts } = await supabase
      .from("server_members")
      .select("server_id")
      .in("server_id", serverIds);

    // Count members per server
    const countMap: Record<string, number> = {};
    (memberCounts || []).forEach((m) => {
      countMap[m.server_id] = (countMap[m.server_id] || 0) + 1;
    });

    const withCounts: DiscoverableServer[] = discoverableServers.map((s) => ({
      ...s,
      member_count: countMap[s.id] || 0,
    }));

    setServers(withCounts);
    setLoading(false);
  };

  const loadBots = async () => {
    const supabase = createClient();
    const { data: bots } = await supabase
      .from("bots")
      .select("*, owner:users!bots_owner_id_fkey(display_name)")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (bots) {
      setPublicBots(
        bots.map((b: Record<string, unknown>) => ({
          ...b,
          owner_name: (b.owner as { display_name?: string } | null)?.display_name || "Unknown",
        })) as (Bot & { owner_name?: string })[]
      );
    }
  };

  const handleBotInvite = async (bot: Bot, serverId: string) => {
    setBotInvitingServerId(serverId);
    const supabase = createClient();

    // Check if bot is already a member
    const { data: existing } = await supabase
      .from("server_members")
      .select("id")
      .eq("server_id", serverId)
      .eq("user_id", bot.user_id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("server_members").insert({
        server_id: serverId,
        user_id: bot.user_id,
      });
    }

    setBotInvitedServerIds((prev) => { const next = new Set(prev); next.add(serverId); return next; });
    setBotInvitingServerId(null);
  };

  const handleDmBot = async (bot: Bot) => {
    const dm = await createDmChannel(bot.user_id);
    if (dm) {
      onClose();
      router.push(`/channels/me/${dm.id}`);
    }
  };

  const handleJoin = async (serverId: string) => {
    if (!user) return;
    setJoiningId(serverId);
    const supabase = createClient();

    // Check if banned from this server
    const { data: ban } = await supabase
      .from("server_bans")
      .select("id")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (ban) {
      setJoiningId(null);
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("server_members")
      .select("id")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      await supabase.from("server_members").insert({
        server_id: serverId,
        user_id: user.id,
      });
    }

    await fetchServers();
    setJoinedIds((prev) => { const next = new Set(prev); next.add(serverId); return next; });
    setJoiningId(null);
  };

  const filteredServers = searchQuery.trim()
    ? servers.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.tag?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : servers;

  const filteredBots = searchQuery.trim()
    ? publicBots.filter(
        (b) =>
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : publicBots;

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-discord-chat">
      {/* Header */}
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Compass className="w-6 h-6 text-discord-green" />
          <h2 className="text-lg font-bold text-white">Explore</h2>
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={() => setTab("servers")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === "servers" ? "bg-discord-brand/20 text-discord-brand" : "text-gray-400 hover:text-white hover:bg-discord-hover"
              }`}
            >
              Servers
            </button>
            <button
              onClick={() => setTab("bots")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === "bots" ? "bg-discord-brand/20 text-discord-brand" : "text-gray-400 hover:text-white hover:bg-discord-hover"
              }`}
            >
              Bots
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-discord-hover text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder={tab === "servers" ? "Search servers by name, description, or tag..." : "Search public bots..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-discord-darker border-gray-700"
            autoFocus
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-6xl mx-auto p-6">
          {tab === "servers" ? (
            <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-400 animate-pulse text-lg">Discovering servers...</div>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Compass className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                {searchQuery ? "No servers found" : "No public servers yet"}
              </h3>
              <p className="text-gray-500 max-w-md">
                {searchQuery
                  ? "Try a different search query."
                  : "Be the first to make your server discoverable! Enable it in Server Settings."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServers.map((server) => {
                const isJoined = joinedIds.has(server.id);
                const isJoining = joiningId === server.id;

                return (
                  <div
                    key={server.id}
                    className="bg-discord-darker rounded-xl border border-gray-800 overflow-hidden hover:border-gray-600 transition-all group"
                  >
                    {/* Banner */}
                    <div
                      className="h-28 relative"
                      style={
                        server.banner_gradient_start && server.banner_gradient_end
                          ? { background: `linear-gradient(${server.banner_gradient_angle || 135}deg, ${server.banner_gradient_start}, ${server.banner_gradient_end})` }
                          : { backgroundColor: server.banner_color || "#5865F2" }
                      }
                    >
                      {/* Server icon overlay */}
                      <div className="absolute -bottom-6 left-4">
                        <div
                          className="w-14 h-14 rounded-2xl border-4 border-discord-darker flex items-center justify-center text-xl font-bold text-white shadow-lg"
                          style={{ backgroundColor: server.banner_color || "#5865F2" }}
                        >
                          {server.icon_url ? (
                            <img
                              src={server.icon_url}
                              alt={server.name}
                              className="w-full h-full rounded-xl object-cover"
                            />
                          ) : (
                            server.name.charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="pt-8 px-4 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold text-base truncate">{server.name}</h3>
                        {server.tag && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-discord-brand/20 text-discord-brand font-medium shrink-0 uppercase">
                            {server.tag}
                          </span>
                        )}
                      </div>

                      {server.description && (
                        <p className="text-sm text-gray-400 line-clamp-2 mb-3 min-h-[40px]">
                          {server.description}
                        </p>
                      )}

                      {!server.description && <div className="mb-3 min-h-[40px]" />}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                          <Users className="w-3.5 h-3.5" />
                          <span>{server.member_count.toLocaleString()} member{server.member_count !== 1 ? "s" : ""}</span>
                        </div>

                        {isJoined ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            className="text-discord-green gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            Joined
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleJoin(server.id)}
                            disabled={isJoining}
                            className="bg-discord-green hover:bg-discord-green/90 text-white"
                          >
                            {isJoining ? "Joining..." : "Join Server"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </>
          ) : (
            /* Bots tab */
            <>
              {filteredBots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <BotIcon className="w-16 h-16 text-gray-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">
                    {searchQuery ? "No bots found" : "No public bots yet"}
                  </h3>
                  <p className="text-gray-500 max-w-md">
                    {searchQuery
                      ? "Try a different search query."
                      : "Developers can make their bots public from the Bot Developer Portal."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBots.map((bot) => (
                    <div
                      key={bot.id}
                      className="bg-discord-darker rounded-xl border border-gray-800 overflow-hidden hover:border-gray-600 transition-all"
                    >
                      <div className="h-20 bg-gradient-to-br from-discord-brand/30 to-purple-600/20 relative">
                        <div className="absolute -bottom-6 left-4">
                          <div className="w-14 h-14 rounded-xl bg-discord-dark border-4 border-discord-darker flex items-center justify-center overflow-hidden">
                            {bot.avatar_url ? (
                              <img src={bot.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <BotIcon className="w-7 h-7 text-discord-brand" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="pt-8 px-4 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-semibold text-base truncate">{bot.name}</h3>
                          <span className="text-[10px] font-bold bg-discord-brand/20 text-discord-brand px-1.5 py-0.5 rounded uppercase">bot</span>
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-2 mb-1 min-h-[40px]">
                          {bot.description || "No description"}
                        </p>
                        <p className="text-xs text-gray-500 mb-3">by {bot.owner_name}</p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => { setBotInvitedServerIds(new Set()); setBotInvite(bot); }}
                            className="flex-1 bg-discord-brand hover:bg-discord-brand-hover text-white gap-1.5 text-xs"
                          >
                            <Users className="w-3.5 h-3.5" />
                            Add to Server
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDmBot(bot)}
                            className="text-gray-400 hover:text-white gap-1.5 text-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            DM
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Bot invite to server picker */}
      {botInvite && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={() => setBotInvite(null)}>
          <div className="bg-discord-channel rounded-xl border border-gray-700 w-full max-w-md mx-4 p-0 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-700">
              <h3 className="font-semibold text-white">Add {botInvite.name} to a Server</h3>
            </div>
            <ScrollArea className="max-h-80 p-3">
              <div className="space-y-1">
                {myServers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">You don&apos;t have any servers.</p>
                ) : (
                  myServers.map((server) => {
                    const isInvited = botInvitedServerIds.has(server.id);
                    const isInviting = botInvitingServerId === server.id;
                    return (
                      <div key={server.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-discord-hover transition-colors">
                        <div className="w-10 h-10 rounded-full bg-discord-darker flex items-center justify-center overflow-hidden shrink-0">
                          {server.icon_url ? (
                            <img src={server.icon_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold">{server.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="flex-1 text-sm font-medium truncate text-white">{server.name}</span>
                        <Button
                          size="sm"
                          disabled={isInvited || isInviting}
                          onClick={() => handleBotInvite(botInvite, server.id)}
                          className={isInvited
                            ? "bg-discord-green/20 text-discord-green border-discord-green/30"
                            : "bg-discord-brand hover:bg-discord-brand-hover text-white"
                          }
                        >
                          {isInvited ? "Added" : isInviting ? "..." : "Add"}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
            <div className="px-5 py-3 border-t border-gray-700 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setBotInvite(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
