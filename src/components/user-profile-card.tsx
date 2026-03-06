"use client";

import { useEffect, useState } from "react";
import { User, UserBadge, Punishment, NAME_FONTS, NameFont, PERMISSIONS, hasPermission } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getStatusColor } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useServerStore } from "@/stores/server-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Headphones, Hammer, Drama, UserPlus, UserMinus, X, Check, Search } from "lucide-react";


interface UserProfileCardProps {
  user: User;
  children: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
  align?: "start" | "center" | "end";
}

export function getNameStyle(user: User): React.CSSProperties {
  const font = NAME_FONTS[(user.name_font as NameFont) || "default"] || "inherit";
  const style: React.CSSProperties = { fontFamily: font };

  if (user.name_gradient_start && user.name_gradient_end) {
    style.background = `linear-gradient(90deg, ${user.name_gradient_start}, ${user.name_gradient_end})`;
    style.WebkitBackgroundClip = "text";
    style.WebkitTextFillColor = "transparent";
    style.backgroundClip = "text";
  } else if (user.name_color) {
    style.color = user.name_color;
  }

  return style;
}

export function UserProfileCard({
  user,
  children,
  side = "right",
  align = "start",
}: UserProfileCardProps) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [activePunishments, setActivePunishments] = useState<Punishment[]>([]);
  const [open, setOpen] = useState(false);
  const [joinedServerName, setJoinedServerName] = useState<string | null>(null);
  const [joinedServerDate, setJoinedServerDate] = useState<string | null>(null);
  const [editingRoles, setEditingRoles] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [friendStatus, setFriendStatus] = useState<"none" | "friends" | "pending_sent" | "pending_received">("none");
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null);
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!open) return;

    const fetchBadges = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_badges")
        .select("*, badge:badges(*)")
        .eq("user_id", user.id);
      setBadges((data as UserBadge[]) || []);
    };

    const fetchPunishments = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_punishments")
        .select("*, issuer:users!user_punishments_issued_by_fkey(display_name, username)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .in("type", ["mute", "suspend", "ban"])
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
      setActivePunishments((data as Punishment[]) || []);
    };

    const currentServer = useServerStore.getState().currentServer;
    const members = useServerStore.getState().members;
    if (currentServer) {
      setJoinedServerName(currentServer.name);
      const member = members.find((m) => m.user_id === user.id);
      if (member) {
        setJoinedServerDate(
          new Date(member.joined_at).toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        );
      }
    } else {
      setJoinedServerName(null);
      setJoinedServerDate(null);
    }

    fetchBadges();
    fetchPunishments();
  }, [open, user.id]);

  // Fetch friend status
  useEffect(() => {
    if (!open || !currentUser || currentUser.id === user.id) return;
    const fetchFriendStatus = async () => {
      const supabase = createClient();
      const { data: requests } = await supabase
        .from("friend_requests")
        .select("id, sender_id, receiver_id, status")
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${currentUser.id})`)
        .in("status", ["accepted", "pending"]);

      if (requests && requests.length > 0) {
        const req = requests[0];
        setFriendRequestId(req.id);
        if (req.status === "accepted") {
          setFriendStatus("friends");
        } else if (req.sender_id === currentUser.id) {
          setFriendStatus("pending_sent");
        } else {
          setFriendStatus("pending_received");
        }
      } else {
        setFriendStatus("none");
        setFriendRequestId(null);
      }
    };
    fetchFriendStatus();
  }, [open, user.id, currentUser]);

  const handleAddFriend = async () => {
    if (!currentUser) return;
    const supabase = createClient();
    await supabase.from("friend_requests").insert({ sender_id: currentUser.id, receiver_id: user.id });
    setFriendStatus("pending_sent");
  };

  const handleCancelRequest = async () => {
    if (!friendRequestId) return;
    const supabase = createClient();
    await supabase.from("friend_requests").delete().eq("id", friendRequestId);
    setFriendStatus("none");
    setFriendRequestId(null);
  };

  const handleRemoveFriend = async () => {
    if (!friendRequestId) return;
    const supabase = createClient();
    await supabase.from("friend_requests").delete().eq("id", friendRequestId);
    setFriendStatus("none");
    setFriendRequestId(null);
  };

  const handleAcceptFriend = async () => {
    if (!friendRequestId) return;
    const supabase = createClient();
    await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", friendRequestId);
    setFriendStatus("friends");
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "online": return "Online";
      case "idle": return "Idle";
      case "dnd": return "Do Not Disturb";
      case "invisible": return "Offline";
      case "offline": return "Offline";
      default: return "Offline";
    }
  };

  const getDaysLeft = (expiresAt: string | null) => {
    if (!expiresAt) return "never (permanent)";
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "soon";
    const days = Math.ceil(diff / 86400000);
    return `${days} day${days !== 1 ? "s" : ""}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="cursor-pointer text-left"
          onClick={(e) => { e.stopPropagation(); }}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-[340px] p-0 bg-[#232428] border-none rounded-xl overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div
          className="h-[60px] relative"
          style={{ backgroundColor: user.profile_color || "#5865f2" }}
        >
          {user.banner_url && (
            <img src={user.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>

        {/* Avatar */}
        <div className="relative px-4">
          <div className="absolute -top-[38px]">
            <div className="relative">
              <Avatar className="w-[76px] h-[76px] border-[6px] border-[#232428]">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-discord-brand">
                  {user.display_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "absolute bottom-1 right-1 w-5 h-5 rounded-full border-[3px] border-[#232428]",
                  getStatusColor(user.status || "offline")
                )}
              />
            </div>
          </div>
        </div>

        <div className="px-4 pt-10 pb-4">
          {/* Name + username */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-lg font-bold leading-tight" style={getNameStyle(user)}>
                {user.display_name}
              </h3>
              {user.is_bot && (
                <span className="bg-discord-brand text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">BOT</span>
              )}
              {activePunishments.find((p) => p.type === "mute") && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-5 h-5 rounded-md bg-red-500/20 flex items-center justify-center cursor-default hover:scale-125 transition-transform">
                        <Headphones className="w-3.5 h-3.5 text-red-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-discord-darker border border-gray-700 rounded-lg px-3 py-2 shadow-xl max-w-[250px]">
                      <p className="text-sm font-semibold text-red-400">Muted</p>
                      <p className="text-xs text-gray-400 mt-0.5">Reason: {activePunishments.find((p) => p.type === "mute")?.reason}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Expires in {getDaysLeft(activePunishments.find((p) => p.type === "mute")?.expires_at ?? null)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {activePunishments.find((p) => p.type === "suspend") && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-5 h-5 rounded-md bg-red-500/20 flex items-center justify-center cursor-default hover:scale-125 transition-transform">
                        <Hammer className="w-3.5 h-3.5 text-red-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-discord-darker border border-gray-700 rounded-lg px-3 py-2 shadow-xl max-w-[250px]">
                      <p className="text-sm font-semibold text-red-400">Suspended</p>
                      <p className="text-xs text-gray-400 mt-0.5">Reason: {activePunishments.find((p) => p.type === "suspend")?.reason}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Expires in {getDaysLeft(activePunishments.find((p) => p.type === "suspend")?.expires_at ?? null)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {activePunishments.find((p) => p.type === "ban") && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-5 h-5 rounded-md bg-red-500/20 flex items-center justify-center cursor-default hover:scale-125 transition-transform">
                        <Drama className="w-3.5 h-3.5 text-red-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-discord-darker border border-gray-700 rounded-lg px-3 py-2 shadow-xl max-w-[250px]">
                      <p className="text-sm font-semibold text-red-400">Banned</p>
                      <p className="text-xs text-gray-400 mt-0.5">Reason: {activePunishments.find((p) => p.type === "ban")?.reason}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Expires in {getDaysLeft(activePunishments.find((p) => p.type === "ban")?.expires_at ?? null)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-sm text-gray-400">
              {user.username}#{user.id.slice(-4)}
            </p>
          </div>

          {/* Three-column info cards */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-discord-darker rounded-lg p-2.5">
              <p className="text-[11px] font-bold text-white uppercase mb-1">Status</p>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full shrink-0", getStatusColor(user.status || "offline"))} />
                <span className="text-[11px] text-gray-300 truncate">{statusLabel(user.status)}</span>
              </div>
            </div>
            <div className="bg-discord-darker rounded-lg p-2.5">
              <p className="text-[11px] font-bold text-white uppercase mb-1">Badges</p>
              <div className="flex flex-wrap gap-0.5">
                {badges.length > 0 ? badges.slice(0, 4).map((ub) => (
                  <TooltipProvider key={ub.id} delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-base cursor-default hover:scale-125 transition-transform inline-block">
                          {ub.badge?.icon || "⭐"}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-discord-darker border border-gray-700 rounded-lg px-3 py-2 shadow-xl max-w-[200px]">
                        <p className="text-sm font-semibold text-white">{ub.badge?.name || "Badge"}</p>
                        {ub.badge?.description && <p className="text-xs text-gray-400 mt-0.5">{ub.badge.description}</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )) : (
                  <span className="text-[10px] text-gray-500">None</span>
                )}
              </div>
            </div>
            <div className="bg-discord-darker rounded-lg p-2.5">
              <p className="text-[11px] font-bold text-white uppercase mb-1">Joined</p>
              {joinedServerName ? (
                <>
                  <p className="text-[10px] text-gray-400 truncate">{joinedServerName}</p>
                  <p className="text-[10px] text-gray-400">{joinedServerDate}</p>
                </>
              ) : (
                <p className="text-[10px] text-gray-400">
                  {new Date(user.created_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          <div className="h-px bg-gray-700/50 my-3" />

          {/* Bio */}
          {user.about_me && (
            <div className="mb-3">
              <h4 className="text-sm font-bold text-white mb-1.5">Bio</h4>
              <p className="text-[13px] text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{user.about_me}</p>
            </div>
          )}

          {/* Friend action buttons */}
          {currentUser && currentUser.id !== user.id && (
            <div className="flex gap-2 mb-3">
              {friendStatus === "none" && (
                <button
                  onClick={handleAddFriend}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-discord-brand/20 text-discord-brand text-xs font-medium hover:bg-discord-brand/30 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Friend
                </button>
              )}
              {friendStatus === "pending_sent" && (
                <button
                  onClick={handleCancelRequest}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-700/50 text-gray-300 text-xs font-medium hover:bg-red-500/20 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel Request
                </button>
              )}
              {friendStatus === "pending_received" && (
                <button
                  onClick={handleAcceptFriend}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-discord-green/20 text-discord-green text-xs font-medium hover:bg-discord-green/30 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Accept Request
                </button>
              )}
              {friendStatus === "friends" && (
                <button
                  onClick={handleRemoveFriend}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-700/50 text-gray-300 text-xs font-medium hover:bg-red-500/20 hover:text-red-400 transition-colors"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  Remove Friend
                </button>
              )}
            </div>
          )}

          {/* Roles */}
          {(() => {
            const currentServer = useServerStore.getState().currentServer;
            const members = useServerStore.getState().members;
            const roles = useServerStore.getState().roles;
            const memberRoles = useServerStore.getState().memberRoles;
            const member = currentServer ? members.find((m) => m.user_id === user.id) : null;
            const userRoles = member
              ? memberRoles
                  .filter((mr) => mr.member_id === member.id)
                  .map((mr) => roles.find((r) => r.id === mr.role_id))
                  .filter((r): r is NonNullable<typeof r> => !!r && r.name !== "@everyone")
                  .sort((a, b) => a.position - b.position)
              : [];
            
            // Check if current user has EDIT_MEMBERS permission
            const currentMember = currentUser && currentServer ? members.find((m) => m.user_id === currentUser.id) : null;
            const currentMemberPerms = currentMember ? useServerStore.getState().getMemberPermissions(currentMember.id) : 0;
            const canEditMembers = currentUser && currentServer && (
              currentServer.owner_id === currentUser.id || hasPermission(currentMemberPerms, PERMISSIONS.EDIT_MEMBERS)
            );
            const isViewingSelf = currentUser?.id === user.id;
            
            const showSection = userRoles.length > 0 || user.role !== "user" || (canEditMembers && !isViewingSelf && currentServer);
            if (!showSection) return null;

            const availableRoles = roles.filter((r) => r.name !== "@everyone");
            const filteredRoles = availableRoles.filter((r) =>
              r.name.toLowerCase().includes(roleSearch.toLowerCase())
            );

            return (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase">Roles</h4>
                  {canEditMembers && !isViewingSelf && currentServer && member && (
                    <button
                      onClick={() => { setEditingRoles(!editingRoles); setRoleSearch(""); }}
                      className="text-[10px] text-discord-brand hover:text-discord-brand/80 font-medium"
                    >
                      {editingRoles ? "Done" : "Edit"}
                    </button>
                  )}
                </div>
                
                {editingRoles && canEditMembers && member ? (
                  <div className="space-y-2">
                    {/* Selected roles */}
                    {userRoles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {userRoles.map((role) => (
                          <span key={role.id} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: role.color + "30", color: role.color }}>
                            {role.icon && <span>{role.icon}</span>}
                            {role.name}
                            <button
                              onClick={async () => {
                                await useServerStore.getState().removeRole(currentServer!.id, member.id, role.id);
                              }}
                              className="ml-0.5 hover:opacity-70"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Dropdown */}
                    <div className="bg-discord-darker rounded-lg border border-gray-700 overflow-hidden">
                      <div className="p-1.5">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                          <input
                            value={roleSearch}
                            onChange={(e) => setRoleSearch(e.target.value)}
                            placeholder="Search roles..."
                            className="w-full pl-6 pr-2 py-1 text-xs bg-discord-dark rounded border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-discord-brand"
                          />
                        </div>
                      </div>
                      <div className="max-h-32 overflow-y-auto p-1">
                        {filteredRoles.map((role) => {
                          const hasRole = userRoles.some((r) => r.id === role.id);
                          return (
                            <button
                              key={role.id}
                              onClick={async () => {
                                if (hasRole) {
                                  await useServerStore.getState().removeRole(currentServer!.id, member.id, role.id);
                                } else {
                                  await useServerStore.getState().assignRole(currentServer!.id, member.id, role.id);
                                }
                              }}
                              className="w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-discord-hover text-left"
                            >
                              <div
                                className={cn("w-3 h-3 rounded border flex items-center justify-center shrink-0", hasRole ? "border-transparent" : "border-gray-600")}
                                style={hasRole ? { backgroundColor: role.color } : {}}
                              >
                                {hasRole && <Check className="w-2 h-2 text-white" />}
                              </div>
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                              {role.icon && <span className="text-xs">{role.icon}</span>}
                              <span className="text-xs text-gray-200 truncate">{role.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {userRoles.map((role) => (
                      <span key={role.id} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: role.color + "30", color: role.color }}>
                        {role.icon && <span>{role.icon}</span>}
                        {role.name}
                      </span>
                    ))}
                    {user.role !== "user" && (
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", user.role === "superadmin" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400")}>
                        {user.role === "superadmin" ? "Super Admin" : "Admin"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </PopoverContent>
    </Popover>
  );
}
