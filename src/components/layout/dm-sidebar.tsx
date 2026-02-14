"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMessageStore } from "@/stores/message-store";
import { useAuthStore } from "@/stores/auth-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn, getStatusColor } from "@/lib/utils";
import { Users, Plus, Search, X } from "lucide-react";
import { UserProfileCard } from "@/components/user-profile-card";
import { User, FriendRequest } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DmSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const dmChannels = useMessageStore((s) => s.dmChannels);
  const createDmChannel = useMessageStore((s) => s.createDmChannel);
  const deleteDmChannel = useMessageStore((s) => s.deleteDmChannel);
  const unreadDmChannels = useMessageStore((s) => s.unreadDmChannels);
  const markDmAsRead = useMessageStore((s) => s.markDmAsRead);
  const user = useAuthStore((s) => s.user);
  const [showNewDm, setShowNewDm] = useState(false);
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch accepted friends when dialog opens
  useEffect(() => {
    if (!showNewDm || !user) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("friend_requests")
      .select("*, sender:users!friend_requests_sender_id_fkey(*), receiver:users!friend_requests_receiver_id_fkey(*)")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq("status", "accepted")
      .then(({ data }) => {
        const friends = (data as FriendRequest[] | null)?.map((r) =>
          r.sender_id === user.id ? r.receiver : r.sender
        ).filter(Boolean) as User[] || [];
        setFriendsList(friends);
        setLoading(false);
      });
  }, [showNewDm, user]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friendsList;
    const q = searchQuery.toLowerCase();
    return friendsList.filter(
      (f) =>
        f.display_name?.toLowerCase().includes(q) ||
        f.username?.toLowerCase().includes(q)
    );
  }, [friendsList, searchQuery]);

  const handleStartDm = async (friendId: string) => {
    const dm = await createDmChannel(friendId);
    if (dm) {
      setShowNewDm(false);
      setSearchQuery("");
      router.push(`/channels/me/${dm.id}`);
    }
  };

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

        <div className="mt-4 px-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Direct Messages
          </span>
          <button
            onClick={() => setShowNewDm(true)}
            className="text-gray-400 hover:text-white transition-colors"
            title="New conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* New DM Dialog */}
        <Dialog open={showNewDm} onOpenChange={(open) => { setShowNewDm(open); if (!open) setSearchQuery(""); }}>
          <DialogContent className="bg-discord-darker border-gray-700 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">New Conversation</DialogTitle>
            </DialogHeader>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-4">Loading friends...</p>
              ) : filteredFriends.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  {friendsList.length === 0
                    ? "No friends yet. Add some first!"
                    : "No friends match your search."}
                </p>
              ) : (
                filteredFriends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => handleStartDm(friend.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-discord-hover transition-colors text-left"
                  >
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {friend.display_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-discord-darker",
                          getStatusColor(friend.status)
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{friend.display_name}</p>
                      <p className="text-xs text-gray-400 truncate">@{friend.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-2 space-y-0.5">
          {dmChannels.map((dm) => {
            const otherUser = dm.user1_id === user?.id ? dm.user2 : dm.user1;
            if (!otherUser) return null;
            const isActive = pathname?.includes(dm.id);
            const isUnread = unreadDmChannels.has(dm.id);

            return (
              <div
                key={dm.id}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group",
                  isActive
                    ? "bg-discord-active text-white"
                    : isUnread
                    ? "text-white hover:bg-discord-hover bg-discord-hover/40"
                    : "text-gray-400 hover:text-white hover:bg-discord-hover"
                )}
              >
                <button
                  onClick={() => {
                    markDmAsRead(dm.id);
                    router.push(`/channels/me/${dm.id}`);
                  }}
                  className="flex items-center gap-3 flex-1 min-w-0"
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
                  <span className={cn("truncate", isUnread && "font-bold text-white")}>{otherUser.display_name}</span>
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await deleteDmChannel(dm.id);
                    if (isActive) router.push("/channels/me");
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition-all shrink-0"
                  title="Close DM"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
