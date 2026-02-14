"use client";

import { useState, useRef } from "react";
import { useMessageStore } from "@/stores/message-store";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { Smile, PlusCircle, Send } from "lucide-react";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { FileUpload } from "@/components/chat/file-upload";
import { MAX_FILE_SIZE } from "@/lib/utils";

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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useMessageStore((s) => s.sendMessage);
  const sendTyping = useMessageStore((s) => s.sendTyping);
  const settings = useAuthStore((s) => s.settings);

  const handleSend = async () => {
    if (!content.trim() && !isUploading) return;
    await sendMessage(content.trim(), channelId, isDm);
    setContent("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    setContent(e.target.value);
    sendTyping(channelId);
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

  return (
    <div className="px-4 pb-6 pt-1 relative">
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
          onKeyDown={handleKeyDown}
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

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!content.trim() && !isUploading}
          className="p-3 text-discord-brand hover:text-discord-brand-hover disabled:text-gray-600 transition-colors shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
