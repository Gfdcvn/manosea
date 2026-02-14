"use client";

import { useAuthStore } from "@/stores/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getStatusColor } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, Mic, Headphones, MicOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function UserPanel() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const router = useRouter();
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.from("users").update({ status: "invisible" }).eq("id", user.id);
    await logout();
    router.push("/auth/login");
  };

  const handleStatusChange = async (status: string) => {
    await updateProfile({ status: status as "online" | "idle" | "dnd" | "invisible" });
  };

  return (
    <div className="h-[52px] bg-discord-darker flex items-center px-2 gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-1 py-1 rounded hover:bg-discord-hover flex-1 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {user.display_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-discord-darker",
                  getStatusColor(user.status)
                )}
              />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">{user.display_name}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.username}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-48">
          <DropdownMenuItem onClick={() => handleStatusChange("online")}>
            <div className="w-3 h-3 rounded-full bg-discord-green mr-2" />
            Online
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("idle")}>
            <div className="w-3 h-3 rounded-full bg-discord-yellow mr-2" />
            Idle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("dnd")}>
            <div className="w-3 h-3 rounded-full bg-discord-red mr-2" />
            Do Not Disturb
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("invisible")}>
            <div className="w-3 h-3 rounded-full bg-gray-500 mr-2" />
            Invisible
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/channels/me/settings")}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} destructive>
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={cn(
            "p-1.5 rounded hover:bg-discord-hover transition-colors",
            isMuted ? "text-discord-red" : "text-gray-400 hover:text-gray-200"
          )}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-[18px] h-[18px]" /> : <Mic className="w-[18px] h-[18px]" />}
        </button>
        <button
          onClick={() => setIsDeafened(!isDeafened)}
          className={cn(
            "p-1.5 rounded hover:bg-discord-hover transition-colors",
            isDeafened ? "text-discord-red" : "text-gray-400 hover:text-gray-200"
          )}
          title={isDeafened ? "Undeafen" : "Deafen"}
        >
          <Headphones className="w-[18px] h-[18px]" />
        </button>
        <button
          onClick={() => router.push("/channels/me/settings")}
          className="p-1.5 rounded hover:bg-discord-hover text-gray-400 hover:text-gray-200 transition-colors"
          title="User Settings"
        >
          <Settings className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );
}
