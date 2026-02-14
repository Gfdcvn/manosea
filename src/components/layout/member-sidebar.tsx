"use client";

import { useServerStore } from "@/stores/server-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getStatusColor } from "@/lib/utils";
import { ServerMember, User } from "@/types";
import { UserProfileCard } from "@/components/user-profile-card";

export function MemberSidebar() {
  const rawMembers = useServerStore((s) => s.members);
  const members = rawMembers as ServerMember[];

  const onlineMembers = members.filter((m) => {
    const u = m.user as User | undefined;
    return u && u.status !== "invisible" && u.status !== "offline";
  });
  const offlineMembers = members.filter((m) => {
    const u = m.user as User | undefined;
    return !u || u.status === "invisible" || u.status === "offline";
  });

  return (
    <div className="w-60 bg-discord-channel border-l border-gray-800 shrink-0">
      <ScrollArea className="h-full">
        <div className="p-3">
          {/* Online */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase px-1 mb-2">
              Online — {onlineMembers.length}
            </h3>
            <div className="space-y-0.5">
              {onlineMembers.map((member) => (
                <MemberItem key={member.id} member={member} />
              ))}
            </div>
          </div>

          {/* Offline */}
          {offlineMembers.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase px-1 mb-2">
                Offline — {offlineMembers.length}
              </h3>
              <div className="space-y-0.5 opacity-50">
                {offlineMembers.map((member) => (
                  <MemberItem key={member.id} member={member} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function MemberItem({ member }: { member: ServerMember }) {
  const user = member.user as User | undefined;
  if (!user) return null;

  return (
    <UserProfileCard user={user} side="left" align="start">
      <div className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-discord-hover transition-colors">
        <div className="relative shrink-0">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {user.display_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-discord-channel",
              getStatusColor(user.status || "offline")
            )}
          />
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm text-gray-300 truncate">{user.display_name}</span>
          {user.is_bot && (
            <span className="bg-discord-brand text-white text-[9px] px-1 py-0 rounded font-semibold shrink-0">
              BOT
            </span>
          )}
        </div>
      </div>
    </UserProfileCard>
  );
}
