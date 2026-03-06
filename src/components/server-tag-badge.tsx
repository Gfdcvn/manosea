"use client";

import { useState, useRef, useEffect } from "react";
import { useServerStore } from "@/stores/server-store";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { Server } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface ServerTagBadgeProps {
  tag: string;
}

export function ServerTagBadge({ tag }: ServerTagBadgeProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [server, setServer] = useState<Server | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const servers = useServerStore((s) => s.servers);
  const fetchServers = useServerStore((s) => s.fetchServers);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    }
    if (showPopup) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPopup]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Find server with this tag
    const found = servers.find((s) => (s.tags || []).includes(tag));
    if (!found) {
      // Try fetching from DB
      const supabase = createClient();
      const { data } = await supabase
        .from("servers")
        .select("*")
        .contains("tags", [tag])
        .limit(1)
        .single();
      if (data) {
        setServer(data as Server);
        const { count } = await supabase
          .from("server_members")
          .select("*", { count: "exact", head: true })
          .eq("server_id", data.id);
        setMemberCount(count || 0);
        if (user) {
          const { data: membership } = await supabase
            .from("server_members")
            .select("id")
            .eq("server_id", data.id)
            .eq("user_id", user.id)
            .maybeSingle();
          setIsMember(!!membership);
        }
      }
    } else {
      setServer(found);
      const supabase = createClient();
      const { count } = await supabase
        .from("server_members")
        .select("*", { count: "exact", head: true })
        .eq("server_id", found.id);
      setMemberCount(count || 0);
      setIsMember(true); // Already in our server list
    }
    setShowPopup(true);
  };

  const handleJoin = async () => {
    if (!server || !user) return;
    setJoining(true);
    const supabase = createClient();
    await supabase.from("server_members").insert({ server_id: server.id, user_id: user.id });
    await fetchServers();
    setJoining(false);
    setShowPopup(false);
    // Navigate to server
    const { data: channels } = await supabase
      .from("channels")
      .select("id")
      .eq("server_id", server.id)
      .order("position")
      .limit(1);
    if (channels?.[0]) {
      router.push(`/channels/${server.id}/${channels[0].id}`);
    } else {
      router.push(`/channels/${server.id}`);
    }
  };

  const handleVisit = async () => {
    if (!server) return;
    setShowPopup(false);
    const supabase = createClient();
    const { data: channels } = await supabase
      .from("channels")
      .select("id")
      .eq("server_id", server.id)
      .order("position")
      .limit(1);
    if (channels?.[0]) {
      router.push(`/channels/${server.id}/${channels[0].id}`);
    } else {
      router.push(`/channels/${server.id}`);
    }
  };

  const bannerStyle = server
    ? server.banner_gradient_start && server.banner_gradient_end
      ? { background: `linear-gradient(${server.banner_gradient_angle || 135}deg, ${server.banner_gradient_start}, ${server.banner_gradient_end})` }
      : { background: server.banner_color || "#5865f2" }
    : {};

  return (
    <span className="relative inline-flex">
      <button
        onClick={handleClick}
        className="text-[10px] font-bold bg-discord-brand/20 text-discord-brand px-1.5 py-0.5 rounded-full hover:bg-discord-brand/30 transition-colors cursor-pointer leading-tight"
      >
        {tag}
      </button>
      {showPopup && server && (
        <div
          ref={popupRef}
          className="absolute z-[100] bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 bg-discord-darker rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Banner */}
          <div className="h-24 relative" style={bannerStyle}>
            {server.icon_url && (
              <Avatar className="absolute -bottom-6 left-4 w-14 h-14 border-4 border-discord-darker">
                <AvatarImage src={server.icon_url} />
                <AvatarFallback className="bg-discord-brand text-white text-lg">
                  {server.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            {!server.icon_url && (
              <div className="absolute -bottom-6 left-4 w-14 h-14 border-4 border-discord-darker rounded-full bg-discord-brand flex items-center justify-center text-white text-lg font-bold">
                {server.name.charAt(0)}
              </div>
            )}
          </div>
          {/* Content */}
          <div className="pt-8 pb-4 px-4">
            <h3 className="text-white font-bold text-base truncate">{server.name}</h3>
            {server.description && (
              <p className="text-gray-400 text-xs mt-1 line-clamp-2">{server.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {memberCount} member{memberCount !== 1 ? "s" : ""}
              </span>
              <span className="text-discord-brand font-medium">{tag}</span>
            </div>
            <div className="mt-3">
              {isMember ? (
                <Button
                  onClick={handleVisit}
                  className="w-full bg-discord-brand hover:bg-discord-brand/80 text-white text-sm h-9"
                >
                  Visit Server
                </Button>
              ) : (
                <Button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-sm h-9"
                >
                  {joining ? "Joining..." : "Join Server"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
