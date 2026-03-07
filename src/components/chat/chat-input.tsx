"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useMessageStore } from "@/stores/message-store";
import { useAuthStore } from "@/stores/auth-store";
import { useServerStore } from "@/stores/server-store";
import { createClient } from "@/lib/supabase/client";
import { Smile, PlusCircle, Send, Clock, Bold, Italic, Strikethrough, Code, Quote, Eye } from "lucide-react";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { FileUpload } from "@/components/chat/file-upload";
import { MAX_FILE_SIZE } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatInputProps {
  channelId: string;
  isDm?: boolean;
  channelName: string;
}

export function ChatInput({ channelId, isDm = false, channelName }: ChatInputProps) {
  const [content, setContent] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [formatBar, setFormatBar] = useState<{ top: number; left: number } | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);
  const sendMessage = useMessageStore((s) => s.sendMessage);
  const sendTyping = useMessageStore((s) => s.sendTyping);
  const settings = useAuthStore((s) => s.settings);
  const currentUser = useAuthStore((s) => s.user);
  const members = useServerStore((s) => s.members);
  const serverMutes = useServerStore((s) => s.serverMutes);
  const currentServer = useServerStore((s) => s.currentServer);

  // Enforcement checks - platform level
  const isMuted = currentUser?.is_muted && (!currentUser.mute_end || new Date(currentUser.mute_end) > new Date());
  const isSuspended = currentUser?.is_suspended && (!currentUser.suspension_end || new Date(currentUser.suspension_end) > new Date());
  const isBanned = currentUser?.is_banned;
  
  // Server-level mute check
  const isServerMuted = !isDm && currentUser && currentServer && serverMutes.some(
    (m) => m.user_id === currentUser.id && m.server_id === currentServer.id && new Date(m.expires_at) > new Date()
  );
  
  // Muted = can't chat in servers, but CAN chat in DMs
  // Suspended = can't chat anywhere
  const isChatBlocked = isBanned || isSuspended || (isMuted && !isDm) || isServerMuted;

  const getBlockedReason = () => {
    if (isBanned) return "You are banned and cannot send messages.";
    if (isSuspended) return `You are suspended${currentUser?.suspension_reason ? ` for: ${currentUser.suspension_reason}` : ""}. You cannot send messages.`;
    if (isServerMuted) return "You are muted in this server and cannot send messages.";
    if (isMuted && !isDm) return `You are muted${currentUser?.mute_reason ? ` for: ${currentUser.mute_reason}` : ""}. You can only send DMs.`;
    return "";
  };

  // Build mention suggestions list
  const mentionSuggestions = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    const specialItems: { id: string; display_name: string; username: string; avatar_url: string | null; isSpecial: boolean }[] = [];

    if (!isDm) {
      if ("everyone".includes(q) || !q) {
        specialItems.push({ id: "everyone", display_name: "@everyone", username: "everyone", avatar_url: null, isSpecial: true });
      }
      if ("here".includes(q) || !q) {
        specialItems.push({ id: "here", display_name: "@here", username: "here", avatar_url: null, isSpecial: true });
      }
    }

    const userItems = members
      .filter((m) => m.user)
      .map((m) => ({
        id: m.user!.id,
        display_name: m.user!.display_name || m.user!.username,
        username: m.user!.username,
        avatar_url: m.user!.avatar_url || null,
        isSpecial: false,
      }))
      .filter(
        (u) =>
          !q ||
          u.display_name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q)
      );

    return [...specialItems, ...userItems].slice(0, 10);
  }, [mentionQuery, members, isDm]);

  // Scroll active mention item into view
  useEffect(() => {
    if (showMentions && mentionRef.current) {
      const activeItem = mentionRef.current.children[mentionIndex] as HTMLElement;
      activeItem?.scrollIntoView({ block: "nearest" });
    }
  }, [mentionIndex, showMentions]);

  // Detect @ trigger
  const detectMention = useCallback((text: string, cursorPos: number) => {
    // Look backwards from cursor for an unescaped @
    const beforeCursor = text.slice(0, cursorPos);
    const atIdx = beforeCursor.lastIndexOf("@");
    if (atIdx === -1) {
      setShowMentions(false);
      return;
    }
    // Make sure there's no space between @ and query (except none typed yet)
    const query = beforeCursor.slice(atIdx + 1);
    // If there's a space in the query, it's not an active mention
    if (query.includes(" ") || query.includes("\n")) {
      setShowMentions(false);
      return;
    }
    // Check that @ is at start or preceded by a space/newline
    if (atIdx > 0 && !/[\s\n]/.test(beforeCursor[atIdx - 1])) {
      setShowMentions(false);
      return;
    }
    setMentionStartPos(atIdx);
    setMentionQuery(query);
    setMentionIndex(0);
    setShowMentions(true);
  }, []);

  const insertMention = useCallback((suggestion: { id: string; display_name: string; username: string; isSpecial: boolean }) => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const before = content.slice(0, mentionStartPos);
    const after = content.slice(textarea.selectionStart);
    const mentionText = suggestion.isSpecial
      ? `@${suggestion.username} `
      : `@${suggestion.username} `;
    const newContent = before + mentionText + after;
    setContent(newContent);
    setShowMentions(false);
    setMentionQuery("");
    setTimeout(() => {
      const newPos = before.length + mentionText.length;
      textarea.selectionStart = textarea.selectionEnd = newPos;
      textarea.focus();
    }, 0);
  }, [content, mentionStartPos]);

  const handleSend = async () => {
    if (!content.trim() && !isUploading) return;
    setShowMentions(false);
    await sendMessage(content.trim(), channelId, isDm);
    setContent("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mention navigation
    if (showMentions && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        insertMention(mentionSuggestions[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    const sendMode = settings?.send_mode || "button_or_enter";

    if (sendMode === "button_or_enter" && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (sendMode === "button_or_shift_enter" && e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // button_only: no keyboard shortcut, user must click send
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setContent(newValue);
    sendTyping(channelId);
    // Detect @ mention
    const cursorPos = e.target.selectionStart;
    detectMention(newValue, cursorPos);
  };

  const handleClick = () => {
    // Re-detect on click (cursor position change)
    const textarea = inputRef.current;
    if (textarea) {
      detectMention(content, textarea.selectionStart);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = inputRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setContent((prev) => prev + emoji);
    }
    setShowEmoji(false);
  };

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    const supabase = createClient();

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File ${file.name} is too large (max 25MB)`);
        continue;
      }

      const filePath = `${channelId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("attachments")
        .upload(filePath, file);

      if (error) {
        console.error("Upload failed:", error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("attachments")
        .getPublicUrl(filePath);

      // Send message with attachment
      const msg = await sendMessage(content || "", channelId, isDm);
      if (msg) {
        await supabase.from("attachments").insert({
          message_id: msg.id,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        });
      }
    }

    setContent("");
    setIsUploading(false);
    setShowFileUpload(false);
  };

  const wrapSelection = useCallback((prefix: string, suffix: string) => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) return;
    const selected = content.slice(start, end);
    const newContent = content.slice(0, start) + prefix + selected + suffix + content.slice(end);
    setContent(newContent);
    setFormatBar(null);
    setTimeout(() => {
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = end + prefix.length;
      textarea.focus();
    }, 0);
  }, [content]);

  const handleSelectionChange = useCallback(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end || document.activeElement !== textarea) {
      setFormatBar(null);
      return;
    }
    // Position the bar above the textarea
    const rect = textarea.getBoundingClientRect();
    const parentRect = textarea.parentElement?.parentElement?.getBoundingClientRect();
    if (!parentRect) return;
    setFormatBar({
      top: rect.top - parentRect.top - 40,
      left: Math.min(rect.width / 2, 200),
    });
  }, []);

  return (
    <div className="px-4 pb-6 pt-1 relative">
      {/* Chat blocked overlay */}
      {isChatBlocked && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
          <span>🚫</span>
          <span>{getBlockedReason()}</span>
        </div>
      )}

      {!isChatBlocked && (
        <>
      {/* Mention suggestions popup */}
      {showMentions && mentionSuggestions.length > 0 && (
        <div
          ref={mentionRef}
          className="absolute bottom-full left-4 right-4 mb-1 bg-discord-darker border border-gray-700 rounded-lg shadow-xl max-h-52 overflow-y-auto z-50"
        >
          <div className="px-3 pt-2 pb-1">
            <p className="text-xs font-semibold text-gray-400 uppercase">Members</p>
          </div>
          {mentionSuggestions.map((s, i) => (
            <button
              key={s.id}
              onMouseDown={(e) => { e.preventDefault(); insertMention(s); }}
              onMouseEnter={() => setMentionIndex(i)}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left transition-colors ${
                i === mentionIndex ? "bg-discord-brand/20 text-white" : "text-gray-300 hover:bg-discord-hover"
              }`}
            >
              {s.isSpecial ? (
                <div className="w-6 h-6 rounded-full bg-discord-brand/30 flex items-center justify-center text-xs text-discord-brand font-bold">
                  @
                </div>
              ) : (
                <Avatar className="w-6 h-6">
                  <AvatarImage src={s.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {s.display_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="font-medium">{s.display_name}</span>
              {!s.isSpecial && (
                <span className="text-xs text-gray-500">@{s.username}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmoji && (
        <div className="absolute bottom-full right-4 mb-2 z-50">
          <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      {/* File Upload Popup */}
      {showFileUpload && (
        <div className="absolute bottom-full left-4 mb-2 z-50">
          <FileUpload onUpload={handleFileUpload} onClose={() => setShowFileUpload(false)} />
        </div>
      )}

      {/* Formatting bar */}
      {formatBar && (
        <div
          className="absolute z-50 flex items-center gap-0.5 bg-discord-darker border border-gray-600 rounded-lg shadow-xl px-1 py-0.5"
          style={{ bottom: "calc(100% + 4px)", left: `${formatBar.left}px`, transform: "translateX(-50%)" }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button onClick={() => wrapSelection("**", "**")} className="p-1.5 text-gray-400 hover:text-white hover:bg-discord-hover rounded transition-colors" title="Bold">
            <Bold className="w-4 h-4" />
          </button>
          <button onClick={() => wrapSelection("*", "*")} className="p-1.5 text-gray-400 hover:text-white hover:bg-discord-hover rounded transition-colors" title="Italic">
            <Italic className="w-4 h-4" />
          </button>
          <button onClick={() => wrapSelection("~~", "~~")} className="p-1.5 text-gray-400 hover:text-white hover:bg-discord-hover rounded transition-colors" title="Strikethrough">
            <Strikethrough className="w-4 h-4" />
          </button>
          <button onClick={() => wrapSelection("`", "`")} className="p-1.5 text-gray-400 hover:text-white hover:bg-discord-hover rounded transition-colors" title="Code">
            <Code className="w-4 h-4" />
          </button>
          <button onClick={() => wrapSelection("||", "||")} className="p-1.5 text-gray-400 hover:text-white hover:bg-discord-hover rounded transition-colors" title="Spoiler">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => wrapSelection("> ", "")} className="p-1.5 text-gray-400 hover:text-white hover:bg-discord-hover rounded transition-colors" title="Quote">
            <Quote className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-0 bg-discord-input rounded-lg">
        {/* Attachment button */}
        <button
          onClick={() => setShowFileUpload(!showFileUpload)}
          className="p-3 text-gray-400 hover:text-white transition-colors shrink-0"
        >
          <PlusCircle className="w-5 h-5" />
        </button>

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={content}
          onChange={handleChange}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onSelect={handleSelectionChange}
          onMouseUp={handleSelectionChange}
          placeholder={`Message ${isDm ? "@" : "#"}${channelName}`}
          rows={1}
          className="flex-1 bg-transparent py-3 text-sm text-gray-200 placeholder:text-discord-muted outline-none resize-none max-h-48 min-h-[44px]"
          style={{ height: "auto" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 192) + "px";
          }}
        />

        {/* Emoji button */}
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="p-3 text-gray-400 hover:text-white transition-colors shrink-0"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Schedule button */}
        <button
          onClick={() => {
            if (!content.trim()) return;
            const now = new Date();
            now.setHours(now.getHours() + 1);
            setScheduleDate(now.toISOString().slice(0, 10));
            setScheduleTime(now.toTimeString().slice(0, 5));
            setShowSchedule(!showSchedule);
          }}
          className="p-3 text-gray-400 hover:text-white transition-colors shrink-0"
          title="Schedule message"
        >
          <Clock className="w-5 h-5" />
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!content.trim() && !isUploading}
          className="p-3 text-discord-brand hover:text-discord-brand-hover disabled:text-gray-600 transition-colors shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Schedule dialog */}
      {showSchedule && (
        <div className="mt-2 p-3 bg-discord-darker border border-gray-700 rounded-lg">
          <p className="text-sm font-semibold text-white mb-2">Schedule Message</p>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="bg-discord-input border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 outline-none focus:border-discord-brand"
            />
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="bg-discord-input border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 outline-none focus:border-discord-brand"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!content.trim() || !scheduleDate || !scheduleTime) return;
                const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
                const supabase = createClient();
                const user = useAuthStore.getState().user;
                if (!user) return;
                const insertData: Record<string, unknown> = {
                  user_id: user.id,
                  content: content.trim(),
                  scheduled_at: scheduledAt,
                  sent: false,
                };
                if (isDm) {
                  insertData.dm_channel_id = channelId;
                } else {
                  insertData.channel_id = channelId;
                }
                const { error } = await supabase.from("scheduled_messages").insert(insertData);
                if (!error) {
                  setContent("");
                  setShowSchedule(false);
                }
              }}
              className="px-3 py-1.5 text-sm bg-discord-brand hover:bg-discord-brand-hover text-white rounded transition-colors"
            >
              Schedule
            </button>
            <button
              onClick={() => setShowSchedule(false)}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
