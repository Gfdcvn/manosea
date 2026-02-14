"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { FriendRequest, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMessageStore } from "@/stores/message-store";
import { useRouter } from "next/navigation";
import { cn, getStatusColor } from "@/lib/utils";
import { Check, X, MessageSquare } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserProfileCard } from "@/components/user-profile-card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function FriendsList() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const createDmChannel = useMessageStore((s) => s.createDmChannel);
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendRequest[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendRequest[]>([]);
  const [addUsername, setAddUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchFriends();
  }, [user]);

  const fetchFriends = async () => {
    setLoading(true);
    const supabase = createClient();
    if (!user) return;

    const { data: requests } = await supabase
      .from("friend_requests")
      .select("*, sender:users!friend_requests_sender_id_fkey(*), receiver:users!friend_requests_receiver_id_fkey(*)")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (requests) {
      setFriends(requests.filter((r) => r.status === "accepted"));
      setPendingReceived(
        requests.filter((r) => r.status === "pending" && r.receiver_id === user.id)
      );
      setPendingSent(
        requests.filter((r) => r.status === "pending" && r.sender_id === user.id)
      );
    }
    setLoading(false);
  };

  const handleSendRequest = async () => {
    const supabase = createClient();
    if (!user || !addUsername.trim()) return;
    setError(null);
    setSuccess(null);

    const { data: targetUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", addUsername.trim())
      .single();

    if (!targetUser) {
      setError("User not found");
      return;
    }

    if (targetUser.id === user.id) {
      setError("You can't add yourself");
      return;
    }

    const { error: sendError } = await supabase.from("friend_requests").insert({
      sender_id: user.id,
      receiver_id: targetUser.id,
    });

    if (sendError) {
      setError("Failed to send request (may already exist)");
    } else {
      setSuccess("Friend request sent!");
      setAddUsername("");
      fetchFriends();
    }
  };

  const handleAccept = async (requestId: string) => {
    const supabase = createClient();
    await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);
    fetchFriends();
  };

  const handleReject = async (requestId: string) => {
    const supabase = createClient();
    await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", requestId);
    fetchFriends();
  };

  const handleMessage = async (friendId: string) => {
    const dm = await createDmChannel(friendId);
    if (dm) {
      router.push(`/channels/me/${dm.id}`);
    }
  };

  const getFriend = (request: FriendRequest): User | undefined => {
    if (request.sender_id === user?.id) return request.receiver;
    return request.sender;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading friends..." />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <Tabs defaultValue="online">
        <TabsList>
          <TabsTrigger value="online">Online</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">
            Pending
            {pendingReceived.length > 0 && (
              <span className="ml-1 bg-discord-red text-white text-[10px] px-1.5 rounded-full">
                {pendingReceived.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="add" className="text-discord-green">
            Add Friend
          </TabsTrigger>
        </TabsList>

        <TabsContent value="online">
          <div className="space-y-1">
            {friends
              .filter((f) => {
                const friend = getFriend(f);
                return friend && friend.status !== "invisible";
              })
              .map((request) => {
                const friend = getFriend(request);
                if (!friend) return null;
                return (
                  <FriendItem
                    key={request.id}
                    user={friend}
                    onMessage={() => handleMessage(friend.id)}
                  />
                );
              })}
          </div>
        </TabsContent>

        <TabsContent value="all">
          <p className="text-xs text-gray-400 mb-3 uppercase font-semibold">
            All Friends — {friends.length}
          </p>
          <div className="space-y-1">
            {friends.map((request) => {
              const friend = getFriend(request);
              if (!friend) return null;
              return (
                <FriendItem
                  key={request.id}
                  user={friend}
                  onMessage={() => handleMessage(friend.id)}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <p className="text-xs text-gray-400 mb-3 uppercase font-semibold">
            Pending — {pendingReceived.length + pendingSent.length}
          </p>
          <div className="space-y-1">
            {pendingReceived.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-discord-hover"
              >
                <div className="flex items-center gap-3">
                  {request.sender && (
                    <UserProfileCard user={request.sender} side="right" align="start">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={request.sender?.avatar_url || undefined} />
                        <AvatarFallback>{request.sender?.display_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </UserProfileCard>
                  )}
                  {!request.sender && (
                    <Avatar className="w-9 h-9">
                      <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <p className="text-sm text-white font-medium">{request.sender?.display_name}</p>
                    <p className="text-xs text-gray-400">Incoming Friend Request</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(request.id)}
                    className="p-2 bg-discord-active rounded-full hover:bg-discord-hover text-gray-400 hover:text-white"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    className="p-2 bg-discord-active rounded-full hover:bg-discord-hover text-gray-400 hover:text-discord-red"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {pendingSent.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-discord-hover"
              >
                <div className="flex items-center gap-3">
                  {request.receiver && (
                    <UserProfileCard user={request.receiver} side="right" align="start">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={request.receiver?.avatar_url || undefined} />
                        <AvatarFallback>{request.receiver?.display_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </UserProfileCard>
                  )}
                  {!request.receiver && (
                    <Avatar className="w-9 h-9">
                      <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <p className="text-sm text-white font-medium">{request.receiver?.display_name}</p>
                    <p className="text-xs text-gray-400">Outgoing Friend Request</p>
                  </div>
                </div>
                <button
                  onClick={() => handleReject(request.id)}
                  className="p-2 bg-discord-active rounded-full hover:bg-discord-hover text-gray-400 hover:text-discord-red"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="add">
          <div className="bg-discord-darker rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-1">Add Friend</h3>
            <p className="text-xs text-gray-400 mb-4">
              You can add friends with their Ricord username.
            </p>
            {error && <p className="text-discord-red text-sm mb-2">{error}</p>}
            {success && <p className="text-discord-green text-sm mb-2">{success}</p>}
            <div className="flex gap-2">
              <Input
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                placeholder="Enter a username"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
              />
              <Button onClick={handleSendRequest} disabled={!addUsername.trim()}>
                Send Friend Request
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FriendItem({ user, onMessage }: { user: User; onMessage: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-discord-hover group">
      <UserProfileCard user={user} side="right" align="start">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-9 h-9">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>{user.display_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-discord-chat",
                getStatusColor(user.status)
              )}
            />
          </div>
          <div>
            <p className="text-sm text-white font-medium">{user.display_name}</p>
            <p className="text-xs text-gray-400 capitalize">{user.status}</p>
          </div>
        </div>
      </UserProfileCard>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100">
        <button
          onClick={onMessage}
          className="p-2 bg-discord-active rounded-full hover:bg-discord-hover text-gray-400 hover:text-white"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
