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
import { Settings, LogOut, Mic, Headphones, MicOff, SmilePlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function UserPanel() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const router = useRouter();
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusExpiry, setStatusExpiry] = useState<string>("never");

  // Check & clear expired custom status
  useEffect(() => {
    if (!user?.custom_status_expires_at) return;
    const exp = new Date(user.custom_status_expires_at).getTime();
    const now = Date.now();
    if (exp <= now) {
      updateProfile({ custom_status: null, custom_status_expires_at: null });
      return;
    }
    const timer = setTimeout(() => {
      updateProfile({ custom_status: null, custom_status_expires_at: null });
    }, exp - now);
    return () => clearTimeout(timer);
  }, [user?.custom_status_expires_at, updateProfile]);

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

  const handleSaveCustomStatus = async () => {
    const text = statusText.trim() || null;
    let expiresAt: string | null = null;
    if (text && statusExpiry !== "never") {
      const ms = {
        "30m": 30 * 60 * 1000,
        "1h": 60 * 60 * 1000,
        "4h": 4 * 60 * 60 * 1000,
        "today": (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime() - Date.now(); })(),
        "24h": 24 * 60 * 60 * 1000,
      }[statusExpiry] || 0;
      if (ms > 0) expiresAt = new Date(Date.now() + ms).toISOString();
    }
    await updateProfile({ custom_status: text, custom_status_expires_at: expiresAt });
    setShowStatusDialog(false);
  };

  const handleClearCustomStatus = async () => {
    await updateProfile({ custom_status: null, custom_status_expires_at: null });
    setStatusText("");
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
              {user.custom_status ? (
                <p className="text-[10px] text-gray-300 truncate">{user.custom_status}</p>
              ) : (
                <p className="text-[10px] text-gray-400 truncate">{user.username}</p>
              )}
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-52">
          {/* Custom status row */}
          {user.custom_status && (
            <>
              <div className="px-3 py-1.5 flex items-center gap-2">
                <span className="text-xs text-gray-300 truncate flex-1">&quot;{user.custom_status}&quot;</span>
                <button onClick={handleClearCustomStatus} className="text-gray-500 hover:text-red-400 shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => { setStatusText(user.custom_status || ""); setStatusExpiry("never"); setShowStatusDialog(true); }}>
            <SmilePlus className="w-4 h-4 mr-2" />
            {user.custom_status ? "Edit Custom Status" : "Set Custom Status"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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

      {/* Custom Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Custom Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase mb-2 block">Status Text</label>
              <Input
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="What's on your mind?"
                maxLength={60}
                autoFocus
              />
              <p className="text-[10px] text-gray-500 mt-1">{statusText.length}/60</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase mb-2 block">Clear After</label>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { id: "never", label: "Never" },
                  { id: "30m", label: "30 min" },
                  { id: "1h", label: "1 hour" },
                  { id: "4h", label: "4 hours" },
                  { id: "today", label: "Today" },
                  { id: "24h", label: "24 hours" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setStatusExpiry(opt.id)}
                    className={cn(
                      "px-2.5 py-1.5 rounded text-xs transition-colors",
                      statusExpiry === opt.id
                        ? "bg-discord-brand text-white"
                        : "bg-discord-dark text-gray-400 hover:bg-discord-hover"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCustomStatus}>{statusText.trim() ? "Save" : "Clear Status"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
