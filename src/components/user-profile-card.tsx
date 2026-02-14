"use client";

import { useEffect, useState } from "react";
import { User, UserBadge } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getStatusColor } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
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

interface UserProfileCardProps {
  user: User;
  children: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
  align?: "start" | "center" | "end";
}

export function UserProfileCard({
  user,
  children,
  side = "right",
  align = "start",
}: UserProfileCardProps) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [open, setOpen] = useState(false);

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

    fetchBadges();
  }, [open, user.id]);

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="cursor-pointer text-left"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-[340px] p-0 bg-discord-dark border-none rounded-xl overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner / Color strip */}
        <div
          className="h-[60px] relative"
          style={{
            backgroundColor: user.profile_color || "#5865f2",
          }}
        >
          {user.banner_url && (
            <img
              src={user.banner_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>

        {/* Avatar - overlaps banner */}
        <div className="relative px-4">
          <div className="absolute -top-[38px]">
            <div className="relative">
              <Avatar className="w-[76px] h-[76px] border-[6px] border-discord-dark">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-discord-brand">
                  {user.display_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "absolute bottom-1 right-1 w-5 h-5 rounded-full border-[3px] border-discord-dark",
                  getStatusColor(user.status || "offline")
                )}
              />
            </div>
          </div>


        </div>

        {/* User info card body */}
        <div className="px-4 pt-10 pb-4">
          <div className="bg-discord-darker rounded-lg p-3">
            {/* Name block */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-bold text-white leading-tight">
                  {user.display_name}
                </h3>
                {user.is_bot && (
                  <span className="bg-discord-brand text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                    BOT
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm text-gray-400">@{user.username}</p>
                {badges.length > 0 && badges.map((ub) => (
                  <TooltipProvider key={ub.id} delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="w-5 h-5 rounded-md bg-discord-dark flex items-center justify-center cursor-default hover:scale-125 transition-transform"
                        >
                          <span className="text-xs">{ub.badge?.icon || "⭐"}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-discord-darker border border-gray-700 rounded-lg px-3 py-2 shadow-xl max-w-[200px]"
                      >
                        <p className="text-sm font-semibold text-white">{ub.badge?.name || "Badge"}</p>
                        {ub.badge?.description && (
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{ub.badge.description}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  getStatusColor(user.status || "offline")
                )}
              />
              <span className="text-xs text-gray-400">{statusLabel(user.status)}</span>
            </div>

            {/* Separator */}
            <div className="h-px bg-gray-700 my-3" />

            {/* About Me */}
            {user.about_me && (
              <div className="mb-3">
                <h4 className="text-xs font-bold text-white uppercase mb-1">About Me</h4>
                <p className="text-sm text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                  {user.about_me}
                </p>
              </div>
            )}

            {/* Member Since */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase mb-1">Member Since</h4>
              <p className="text-xs text-gray-400">
                {new Date(user.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Role badge */}
            {user.role !== "user" && (
              <div className="mt-3">
                <h4 className="text-xs font-bold text-white uppercase mb-1">Roles</h4>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    user.role === "superadmin"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-blue-500/20 text-blue-400"
                  )}
                >
                  {user.role === "superadmin" ? "Super Admin" : "Admin"}
                </span>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
