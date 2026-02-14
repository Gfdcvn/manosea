"use client";

import { useRouter, usePathname } from "next/navigation";
import { useMessageStore } from "@/stores/message-store";
import { useAuthStore } from "@/stores/auth-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getStatusColor } from "@/lib/utils";
import { Users } from "lucide-react";
import { UserProfileCard } from "@/components/user-profile-card";
import { User } from "@/types";

export function DmSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const dmChannels = useMessageStore((s) => s.dmChannels);
  const user = useAuthStore((s) => s.user);

  return (
    <ScrollArea className="flex-1">
      <div className="px-2 py-2">
        {/* Friends link */}
        <button
          onClick={() => router.push("/channels/me")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            pathname === "/channels/me"
              ? "bg-discord-active text-white"
              : "text-gray-400 hover:text-white hover:bg-discord-hover"
          )}
        >
          <Users className="w-5 h-5" />
          Friends
        </button>

        <div className="mt-4 px-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Direct Messages
          </span>
        </div>

        <div className="mt-2 space-y-0.5">
          {dmChannels.map((dm) => {
            const otherUser = dm.user1_id === user?.id ? dm.user2 : dm.user1;
            if (!otherUser) return null;
            const isActive = pathname?.includes(dm.id);

            return (
              <button
                key={dm.id}
                onClick={() => router.push(`/channels/me/${dm.id}`)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group",
                  isActive
                    ? "bg-discord-active text-white"
                    : "text-gray-400 hover:text-white hover:bg-discord-hover"
                )}
              >
                <div className="relative">
                  <UserProfileCard user={otherUser as User} side="right" align="start">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={otherUser.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {otherUser.display_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </UserProfileCard>
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-discord-channel",
                      getStatusColor(otherUser.status)
                    )}
                  />
                </div>
                <span className="truncate">{otherUser.display_name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
