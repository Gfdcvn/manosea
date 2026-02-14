"use client";

import { useState } from "react";
import { Message } from "@/types";
import { useMessageStore } from "@/stores/message-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import { Pencil, Trash2, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserProfileCard } from "@/components/user-profile-card";

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
  isOwn: boolean;
}

export function MessageItem({ message, showHeader, isOwn }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");
  const [showActions, setShowActions] = useState(false);
  const editMessage = useMessageStore((s) => s.editMessage);
  const deleteMessage = useMessageStore((s) => s.deleteMessage);

  const handleSaveEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await editMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <div
      className="relative group hover:bg-discord-hover/30 px-2 py-0.5 rounded"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showHeader ? (
        <div className="flex items-start gap-4 pt-4">
          {message.author ? (
            <UserProfileCard user={message.author} side="right" align="start">
              <Avatar className="w-10 h-10 mt-0.5 shrink-0">
                <AvatarImage src={message.author?.avatar_url || undefined} />
                <AvatarFallback className="text-sm">
                  {message.author?.display_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            </UserProfileCard>
          ) : (
            <Avatar className="w-10 h-10 mt-0.5 shrink-0">
              <AvatarFallback className="text-sm">?</AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              {message.author ? (
                <UserProfileCard user={message.author} side="right" align="start">
                  <span className="font-medium text-white hover:underline cursor-pointer">
                    {message.author?.display_name || "Unknown"}
                  </span>
                </UserProfileCard>
              ) : (
                <span className="font-medium text-white">Unknown</span>
              )}
              {message.author?.is_bot && (
                <span className="bg-discord-brand text-white text-[10px] px-1 py-0.5 rounded font-semibold">
                  BOT
                </span>
              )}
              <span className="text-xs text-discord-muted">
                {formatRelativeTime(message.created_at)}
              </span>
            </div>
            {isEditing ? (
              <div className="mt-1">
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <div className="flex gap-2 mt-1">
                  <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="text-gray-300 text-sm whitespace-pre-wrap break-words">
                {message.content}
                {message.is_edited && (
                  <span className="text-[10px] text-discord-muted ml-1">(edited)</span>
                )}
              </div>
            )}
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((att) => {
                  const isImage = att.file_type.startsWith("image/");
                  return isImage ? (
                    <div key={att.id} className="max-w-md">
                      <img
                        src={att.file_url}
                        alt={att.file_name}
                        className="rounded-lg max-h-80 object-contain cursor-pointer hover:opacity-90"
                      />
                    </div>
                  ) : (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-discord-darker rounded-lg p-3 max-w-sm hover:bg-discord-dark transition-colors"
                    >
                      <div className="text-discord-brand text-2xl">📎</div>
                      <div className="min-w-0">
                        <p className="text-discord-brand text-sm font-medium truncate hover:underline">
                          {att.file_name}
                        </p>
                        <p className="text-xs text-discord-muted">
                          {(att.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4 pl-14">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div>
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <div className="flex gap-2 mt-1">
                  <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="text-gray-300 text-sm whitespace-pre-wrap break-words">
                {message.content}
                {message.is_edited && (
                  <span className="text-[10px] text-discord-muted ml-1">(edited)</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {showActions && !isEditing && (
        <div className="absolute -top-3 right-2 flex items-center bg-discord-channel border border-gray-700 rounded shadow-lg">
          {isOwn && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-discord-hover rounded text-gray-400 hover:text-white"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => navigator.clipboard.writeText(message.content || "")}
            className="p-1.5 hover:bg-discord-hover rounded text-gray-400 hover:text-white"
          >
            <Copy className="w-4 h-4" />
          </button>
          {isOwn && (
            <button
              onClick={() => deleteMessage(message.id)}
              className="p-1.5 hover:bg-discord-hover rounded text-discord-red hover:text-discord-red-hover"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
