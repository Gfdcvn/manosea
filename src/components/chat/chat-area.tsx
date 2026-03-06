"use client";

import { useRef, useEffect, useState } from "react";
import { useMessageStore } from "@/stores/message-store";
import { useAuthStore } from "@/stores/auth-store";
import { MessageItem } from "@/components/chat/message-item";
import { ChatInput } from "@/components/chat/chat-input";
import { Hash, AtSign, Pin, X } from "lucide-react";
import { User, Message } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserProfileCard } from "@/components/user-profile-card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatRelativeTime } from "@/lib/utils";
import { ReportDialog } from "@/components/report-dialog";

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
  const pinnedMessages = useMessageStore((s) => s.pinnedMessages);
  const fetchPinnedMessages = useMessageStore((s) => s.fetchPinnedMessages);
  const unpinMessage = useMessageStore((s) => s.unpinMessage);
  const user = useAuthStore((s) => s.user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);
  const [showPins, setShowPins] = useState(false);
  const [reportTarget, setReportTarget] = useState<Message | null>(null);

  useEffect(() => {
    fetchPinnedMessages(channelId, isDm);
  }, [channelId, isDm, fetchPinnedMessages]);

  const pinnedMessageIds = new Set(pinnedMessages.map((p) => p.message_id));

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
    <div className="flex-1 flex flex-row">
    <div className="flex-1 flex flex-col bg-discord-chat min-w-0">
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
        {/* Pin toggle */}
        <button
          onClick={() => setShowPins(!showPins)}
          className={`ml-auto p-1.5 rounded hover:bg-discord-hover transition-colors relative ${showPins ? "text-white" : "text-gray-400"}`}
          title="Pinned Messages"
        >
          <Pin className="w-5 h-5" />
          {pinnedMessages.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-discord-brand rounded-full text-[10px] text-white flex items-center justify-center font-bold">
              {pinnedMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4"
      >
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" label="Loading messages..." />
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
                channelId={channelId}
                isDm={isDm}
                isPinned={pinnedMessageIds.has(msg.id)}
                onReport={(m) => setReportTarget(m)}
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

    {/* Pinned Messages Panel */}
    {showPins && (
      <div className="w-80 bg-discord-channel border-l border-gray-800 flex flex-col shrink-0">
        <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-gray-400" />
            <span className="text-white font-semibold text-sm">Pinned Messages</span>
            <span className="text-xs text-gray-500">{pinnedMessages.length}</span>
          </div>
          <button onClick={() => setShowPins(false)} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {pinnedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Pin className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm">No pinned messages yet</p>
              <p className="text-gray-600 text-xs mt-1">Pin important messages to find them easily</p>
            </div>
          ) : (
            pinnedMessages.map((pin) => (
              <div key={pin.id} className="bg-discord-darker rounded-lg p-3 border border-gray-800 group relative">
                <div className="flex items-start gap-2">
                  <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                    <AvatarImage src={pin.message?.author?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {pin.message?.author?.display_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-medium text-white truncate">
                        {pin.message?.author?.display_name || "Unknown"}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {pin.message ? formatRelativeTime(pin.message.created_at) : ""}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-0.5 break-words line-clamp-3">
                      {pin.message?.content}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => unpinMessage(pin.message_id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-discord-hover text-gray-400 hover:text-white"
                  title="Unpin"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    )}

    {/* Report Dialog */}
    <ReportDialog
      open={!!reportTarget}
      onClose={() => setReportTarget(null)}
      reportType="message"
      targetMessageId={reportTarget?.id}
      targetUserId={reportTarget?.author_id}
      targetInfo={reportTarget ? `Message by ${reportTarget.author?.display_name || "Unknown"}` : ""}
    />
    </div>
  );
}
