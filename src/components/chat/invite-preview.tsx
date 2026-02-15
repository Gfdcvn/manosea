"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useServerStore } from "@/stores/server-store";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

interface ServerPreview {
  id: string;
  name: string;
  description: string | null;
  tag: string | null;
  banner_color: string | null;
  icon_url: string | null;
  member_count: number;
}

export function InvitePreview({ code }: { code: string }) {
  const [server, setServer] = useState<ServerPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [banned, setBanned] = useState(false);
  const [expired, setExpired] = useState(false);
  const user = useAuthStore((s) => s.user);
  const servers = useServerStore((s) => s.servers);
  const fetchServers = useServerStore((s) => s.fetchServers);
  const router = useRouter();

  useEffect(() => {
    const fetchInvite = async () => {
      setLoading(true);
      const supabase = createClient();

      // Fetch the invite
      const { data: invite } = await supabase
        .from("server_invites")
        .select("server_id, expires_at")
        .eq("code", code)
        .maybeSingle();

      if (!invite) {
        setLoading(false);
        return;
      }

      // Check if expired
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setExpired(true);
        setLoading(false);
        return;
      }

      // Fetch server info
      const { data: srv } = await supabase
        .from("servers")
        .select("id, name, description, tag, banner_color, icon_url")
        .eq("id", invite.server_id)
        .single();

      if (!srv) {
        setLoading(false);
        return;
      }

      // Get member count
      const { count } = await supabase
        .from("server_members")
        .select("id", { count: "exact", head: true })
        .eq("server_id", srv.id);

      // Check if user is already a member
      if (user) {
        const alreadyMember = servers.some((s) => s.id === srv.id);
        if (alreadyMember) setJoined(true);

        // Check if banned
        const { data: ban } = await supabase
          .from("server_bans")
          .select("id")
          .eq("server_id", srv.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (ban) setBanned(true);
      }

      setServer({
        ...srv,
        member_count: count || 0,
      });
      setLoading(false);
    };

    fetchInvite();
  }, [code, user, servers]);

  const handleJoin = async () => {
    if (!user || !server || banned) return;
    setJoining(true);
    const supabase = createClient();

    // Double-check ban
    const { data: ban } = await supabase
      .from("server_bans")
      .select("id")
      .eq("server_id", server.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ban) {
      setBanned(true);
      setJoining(false);
      return;
    }

    // Check if already member
    const { data: existing } = await supabase
      .from("server_members")
      .select("id")
      .eq("server_id", server.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      setJoined(true);
      setJoining(false);
      router.push(`/channels/${server.id}`);
      return;
    }

    await supabase.from("server_members").insert({
      server_id: server.id,
      user_id: user.id,
      role: "member",
    });

    await fetchServers();
    setJoined(true);
    setJoining(false);
    router.push(`/channels/${server.id}`);
  };

  if (loading) {
    return (
      <div className="bg-discord-darker border border-gray-700/50 rounded-lg p-4 max-w-sm mt-1 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-700 rounded w-48" />
      </div>
    );
  }

  if (!server) {
    if (expired) {
      return (
        <div className="bg-discord-darker border border-gray-700/50 rounded-lg p-4 max-w-sm mt-1">
          <p className="text-sm text-gray-400">This invite has expired.</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-discord-darker border border-gray-700/50 rounded-lg overflow-hidden max-w-sm mt-1">
      {/* Banner */}
      {server.banner_color && (
        <div className="h-16" style={{ backgroundColor: server.banner_color }} />
      )}

      <div className="p-4">
        {/* Server name + tag */}
        <div className="flex items-center gap-2 mb-1">
          {server.icon_url ? (
            <img
              src={server.icon_url}
              alt={server.name}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: server.banner_color || "#5865F2" }}
            >
              {server.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white truncate">{server.name}</span>
              {server.tag && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-discord-brand/20 text-discord-brand font-medium shrink-0 uppercase">
                  {server.tag}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Users className="w-3 h-3" />
              <span>{server.member_count} {server.member_count === 1 ? "member" : "members"}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {server.description && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-2">{server.description}</p>
        )}

        {/* Join button */}
        <div className="mt-3">
          {banned ? (
            <Button disabled className="w-full" size="sm">
              You are banned from this server
            </Button>
          ) : joined ? (
            <Button
              className="w-full bg-discord-green hover:bg-discord-green/80"
              size="sm"
              onClick={() => router.push(`/channels/${server.id}`)}
            >
              Joined
            </Button>
          ) : (
            <Button
              className="w-full bg-discord-brand hover:bg-discord-brand-hover"
              size="sm"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? "Joining..." : "Join Server"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
