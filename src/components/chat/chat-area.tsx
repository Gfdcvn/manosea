"use client";

import { useRef, useEffect } from "react";
import { useMessageStore } from "@/stores/message-store";
import { useAuthStore } from "@/stores/auth-store";
import { MessageItem } from "@/components/chat/message-item";
import { ChatInput } from "@/components/chat/chat-input";
import { Hash, AtSign } from "lucide-react";
import { User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserProfileCard } from "@/components/user-profile-card";

interface ChatAreaProps {
  channelName: string;
  channelId: string;
  isDm?: boolean;
  otherUser?: User | null;
}

export function ChatArea({ channelName, channelId, isDm = false, otherUser }: ChatAreaProps) {
  const messages = useMessageStore((s) => s.messages);
  const isLoading = useMessageStore((s) => s.isLoading);
  const hasMore = useMessageStore((s) => s.hasMore);
  const fetchMoreMessages = useMessageStore((s) => s.fetchMoreMessages);
  const typingUsers = useMessageStore((s) => s.typingUsers);
  const user = useAuthStore((s) => s.user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  useEffect(() => {
    if (isAtBottom.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    isAtBottom.current = target.scrollHeight - target.scrollTop - target.clientHeight < 100;

    if (target.scrollTop < 50 && hasMore && !isLoading) {
      fetchMoreMessages(channelId, isDm);
    }
  };

  // Check if other user is messagable (for bot restrictions)
  const canMessage = isDm && otherUser ? otherUser.is_messagable !== false : true;

  return (
    <div className="flex-1 flex flex-col bg-discord-chat">
      {/* Header */}
      <div className="h-12 border-b border-gray-800 flex items-center px-4 shadow-sm shrink-0">
        {isDm ? (
          <div className="flex items-center gap-2">
            <AtSign className="w-5 h-5 text-discord-muted" />
            {otherUser ? (
              <UserProfileCard user={otherUser} side="bottom" align="start">
                <span className="text-white font-semibold hover:underline cursor-pointer">{channelName}</span>
              </UserProfileCard>
            ) : (
              <span className="text-white font-semibold">{channelName}</span>
            )}
            {otherUser?.is_bot && (
              <span className="bg-discord-brand text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                BOT
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-discord-muted" />
            <span className="text-white font-semibold">{channelName}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4"
      >
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-pulse text-discord-muted">Loading messages...</div>
          </div>
        )}

        {/* Welcome message */}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {isDm && otherUser ? (
              <>
                <UserProfileCard user={otherUser} side="bottom" align="center">
                  <Avatar className="w-20 h-20 mb-4">
                    <AvatarImage src={otherUser.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {otherUser.display_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                </UserProfileCard>
                <h2 className="text-2xl font-bold text-white">{otherUser.display_name}</h2>
                <p className="text-gray-400 mt-1">
                  This is the beginning of your direct message history with{" "}
                  <span className="font-semibold">{otherUser.display_name}</span>.
                </p>
              </>
            ) : (
              <>
                <Hash className="w-16 h-16 text-discord-muted mb-4" />
                <h2 className="text-2xl font-bold text-white">Welcome to #{channelName}!</h2>
                <p className="text-gray-400 mt-1">
                  This is the start of the #{channelName} channel.
                </p>
              </>
            )}
          </div>
        )}

        <div className="py-4 space-y-0">
          {messages.map((msg, idx) => {
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showHeader =
              !prevMsg ||
              prevMsg.author_id !== msg.author_id ||
              new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 420000;

            return (
              <MessageItem
                key={msg.id}
                message={msg}
                showHeader={showHeader}
                isOwn={msg.author_id === user?.id}
              />
            );
          })}
        </div>
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-xs text-gray-400">
          <span className="animate-pulse-dot">●●●</span>{" "}
          {typingUsers.map((t) => t.username).join(", ")}{" "}
          {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>
      )}

      {/* Input */}
      {canMessage ? (
        <ChatInput channelId={channelId} isDm={isDm} channelName={channelName} />
      ) : (
        <div className="px-4 py-3 bg-discord-channel border-t border-gray-800">
          <div className="bg-discord-input rounded-lg px-4 py-3 text-discord-muted text-sm text-center cursor-not-allowed">
            This bot cannot receive messages
          </div>
        </div>
      )}
    </div>
  );
}
