"use client";

import { useServerStore } from "@/stores/server-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getStatusColor } from "@/lib/utils";
import { ServerMember, User, ServerRole } from "@/types";
import { UserProfileCard } from "@/components/user-profile-card";

export function MemberSidebar() {
  const rawMembers = useServerStore((s) => s.members);
  const members = rawMembers as ServerMember[];
  const roles = useServerStore((s) => s.roles);
  const memberRoles = useServerStore((s) => s.memberRoles);

  // Get elevated roles sorted by position (highest first)
  const elevatedRoles = roles
    .filter((r) => r.is_elevated)
    .sort((a, b) => b.position - a.position);

  // Build groups: elevated role groups + online + offline
  const getMemberTopElevatedRole = (member: ServerMember): ServerRole | null => {
    const mRoleIds = memberRoles
      .filter((mr) => mr.member_id === member.id)
      .map((mr) => mr.role_id);
    const mRoles = elevatedRoles.filter((r) => mRoleIds.includes(r.id));
    return mRoles[0] || null;
  };

  const getMemberRoleIcon = (member: ServerMember): string | null => {
    const mRoleIds = memberRoles
      .filter((mr) => mr.member_id === member.id)
      .map((mr) => mr.role_id);
    const mRoles = roles
      .filter((r) => mRoleIds.includes(r.id))
      .sort((a, b) => b.position - a.position);
    return mRoles.find((r) => r.icon)?.icon || null;
  };

  const getMemberTopColor = (member: ServerMember): string | undefined => {
    const mRoleIds = memberRoles
      .filter((mr) => mr.member_id === member.id)
      .map((mr) => mr.role_id);
    const mRoles = roles
      .filter((r) => mRoleIds.includes(r.id))
      .sort((a, b) => b.position - a.position);
    return mRoles[0]?.color;
  };

  // Categorize members
  const elevatedGroups: { role: ServerRole; members: ServerMember[] }[] = elevatedRoles.map((role) => ({
    role,
    members: members.filter((m) => {
      const topRole = getMemberTopElevatedRole(m);
      return topRole?.id === role.id;
    }),
  }));

  const elevatedMemberIds = new Set(
    elevatedGroups.flatMap((g) => g.members.map((m) => m.id))
  );

  const nonElevatedMembers = members.filter((m) => !elevatedMemberIds.has(m.id));

  const onlineMembers = nonElevatedMembers.filter((m) => {
    const u = m.user as User | undefined;
    return u && u.status !== "invisible" && u.status !== "offline";
  });
  const offlineMembers = nonElevatedMembers.filter((m) => {
    const u = m.user as User | undefined;
    return !u || u.status === "invisible" || u.status === "offline";
  });

  return (
    <div className="w-60 bg-discord-channel border-l border-gray-800 shrink-0">
      <ScrollArea className="h-full">
        <div className="p-3">
          {/* Elevated role groups */}
          {elevatedGroups.map(({ role, members: groupMembers }) => {
            if (groupMembers.length === 0) return null;
            return (
              <div key={role.id} className="mb-4">
                <h3 className="text-xs font-semibold uppercase px-1 mb-2 flex items-center gap-1" style={{ color: role.color }}>
                  {role.icon && <span>{role.icon}</span>}
                  {role.name} — {groupMembers.length}
                </h3>
                <div className="space-y-0.5">
                  {groupMembers.map((member) => (
                    <MemberItem key={member.id} member={member} roleIcon={getMemberRoleIcon(member)} roleColor={getMemberTopColor(member)} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Online */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase px-1 mb-2">
              Online — {onlineMembers.length}
            </h3>
            <div className="space-y-0.5">
              {onlineMembers.map((member) => (
                <MemberItem key={member.id} member={member} roleIcon={getMemberRoleIcon(member)} roleColor={getMemberTopColor(member)} />
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
                  <MemberItem key={member.id} member={member} roleIcon={getMemberRoleIcon(member)} roleColor={getMemberTopColor(member)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function MemberItem({ member, roleIcon, roleColor }: { member: ServerMember; roleIcon?: string | null; roleColor?: string }) {
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
          {roleIcon && <span className="text-sm shrink-0">{roleIcon}</span>}
          <span className="text-sm truncate" style={roleColor ? { color: roleColor } : { color: "#d1d5db" }}>{user.display_name}</span>
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
