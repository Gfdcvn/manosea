"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Message } from "@/types";
import { useMessageStore } from "@/stores/message-store";
import { useServerStore } from "@/stores/server-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import { Pencil, Trash2, Copy, Pin, PinOff, Flag, SmilePlus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserProfileCard, getNameStyle } from "@/components/user-profile-card";
import { ServerTagBadge } from "@/components/server-tag-badge";
import { FormattedMessage } from "@/components/chat/formatted-message";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// --- Full emoji list for custom picker (categorized) ---
const EMOJI_CATEGORIES: Record<string, string[]> = {
  "Smileys": ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","☺️","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","🫤","😟","🙁","☹️","😮","😯","😲","😳","🥺","🥹","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
  "Gestures": ["👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🦷","🦴","👀","👁️","👅","👄"],
  "Hearts": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","💋","💌","💐","🌹","🥀","🌺","🌸","🌼","🌻"],
  "Animals": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰","🪲","🪳","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫"],
  "Food": ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🦴","🌭","🍔","🍟","🍕","🫓","🥪","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯"],
  "Activities": ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏄","🏇","🏊","🤸","🏋️","🚴","🧘","🎪","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎺","🪗","🎸","🪕","🎻","🎲","♟️","🎯","🎳","🎮","🕹️","🎰"],
  "Objects": ["⌚","📱","💻","⌨️","🖥️","🖨️","🖱️","🖲️","🕹️","🗜️","💽","💾","💿","📀","📹","🎥","📽️","🎞️","📞","☎️","📟","📠","📺","📻","🎙️","🎚️","🎛️","🧭","⏱️","⏲️","⏰","🕰️","⌛","⏳","📡","🔋","🪫","🔌","💡","🔦","🕯️","🪔","🧯","🛢️","💸","💵","💴","💶","💷","🪙","💰","💳","💎","⚖️","🪜","🧰","🪛","🔧","🔨","⚒️","🛠️","⛏️","🪚","🔩","⚙️","🪤","🧲","🔫","💣","🧨","🪓","🔪","🗡️","⚔️","🛡️","🚬","⚰️","🪦","⚱️","🏺","🔮","📿","🧿","🪬","💈","⚗️","🔭","🔬","🕳️","🩹","🩺","💊","💉","🩸","🧬","🦠","🧫","🧪","🌡️","🧹","🪠","🧺","🧻","🧼","🫧","🪥","🧽","🧯","🛒"],
  "Symbols": ["💯","🔥","⭐","🌟","✨","⚡","💥","💫","💦","💨","🕊️","🦅","🏳️","🏴","🚩","🏁","🎌","🏳️‍🌈","🏳️‍⚧️","✅","❌","❓","❗","‼️","⁉️","💤","💢","♻️","🔱","📛","🔰","⭕","✅","☑️","✔️","❌","❎","➕","➖","➗","✖️","♾️","💲","💱","™️","©️","®️","〰️","➰","➿","🔚","🔙","🔛","🔜","🔝","🔴","🟠","🟡","🟢","🔵","🟣","🟤","⚫","⚪","🟥","🟧","🟨","🟩","🟦","🟪","🟫","⬛","⬜","◼️","◻️","▪️","▫️","🔶","🔷","🔸","🔹","🔺","🔻","💠","🔘","🔳","🔲"],
};

const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

const ANIMATION_TYPES = ["bounce", "spin", "float", "shake", "pulse"] as const;
type AnimationType = typeof ANIMATION_TYPES[number];

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
  isOwn: boolean;
  channelId?: string;
  isDm?: boolean;
  isPinned?: boolean;
  onReport?: (message: Message) => void;
}

export function MessageItem({ message, showHeader, isOwn, channelId, isDm, isPinned, onReport }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reactions, setReactions] = useState<Record<string, { count: number; userReacted: boolean }>>({});
  const [showReactPicker, setShowReactPicker] = useState(false);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Smileys");
  const [explosionEmojis, setExplosionEmojis] = useState<{ id: number; emoji: string; x: number; y: number; anim: AnimationType }[]>([]);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const explosionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const editMessage = useMessageStore((s) => s.editMessage);
  const deleteMessage = useMessageStore((s) => s.deleteMessage);
  const pinMessage = useMessageStore((s) => s.pinMessage);
  const unpinMessage = useMessageStore((s) => s.unpinMessage);
  const currentUser = useAuthStore((s) => s.user);
  const members = useServerStore((s) => s.members);
  const memberRoles = useServerStore((s) => s.memberRoles);
  const roles = useServerStore((s) => s.roles);
  const currentServer = useServerStore((s) => s.currentServer);

  // Only show role icons/colors when inside a server context (not DMs)
  const inServerContext = !isDm && !!currentServer;
  const authorMember = inServerContext ? members.find((m) => m.user_id === message.author_id) : undefined;
  const authorRoleIds = authorMember
    ? memberRoles.filter((mr) => mr.member_id === authorMember.id).map((mr) => mr.role_id)
    : [];
  const authorRoles = inServerContext
    ? roles.filter((r) => authorRoleIds.includes(r.id)).sort((a, b) => b.position - a.position)
    : [];
  const topRole = authorRoles[0];
  const roleColor = topRole?.color;
  const roleIcon = authorRoles.find((r) => r.icon)?.icon;

  const authorRing = message.author?.avatar_ring;
  const nameEffectClass = message.author?.name_effect && message.author.name_effect !== "none" ? `name-effect-${message.author.name_effect}` : "";

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

  // Load reactions
  const loadReactions = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("message_reactions")
      .select("emoji, user_id")
      .eq("message_id", message.id);
    if (!data) return;
    const map: Record<string, { count: number; userReacted: boolean }> = {};
    data.forEach((r: { emoji: string; user_id: string }) => {
      if (!map[r.emoji]) map[r.emoji] = { count: 0, userReacted: false };
      map[r.emoji].count++;
      if (r.user_id === currentUser?.id) map[r.emoji].userReacted = true;
    });
    setReactions(map);
  }, [message.id, currentUser?.id]);

  useEffect(() => {
    loadReactions();
  }, [loadReactions]);

  // Listen for realtime reaction updates
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.messageId === message.id) {
        loadReactions();
      }
    };
    window.addEventListener("reaction-update", handler);
    return () => window.removeEventListener("reaction-update", handler);
  }, [message.id, loadReactions]);

  const toggleReaction = async (emoji: string) => {
    if (!currentUser) return;
    const supabase = createClient();
    const current = reactions[emoji];
    if (current?.userReacted) {
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", message.id)
        .eq("user_id", currentUser.id)
        .eq("emoji", emoji);

      // Check if this is a reaction role and remove the role
      const { data: rr } = await supabase
        .from("reaction_roles")
        .select("role_id, server_id")
        .eq("message_id", message.id)
        .eq("emoji", emoji)
        .maybeSingle();
      if (rr) {
        const { data: member } = await supabase
          .from("server_members")
          .select("id")
          .eq("server_id", rr.server_id)
          .eq("user_id", currentUser.id)
          .maybeSingle();
        if (member) {
          await supabase
            .from("server_member_roles")
            .delete()
            .eq("member_id", member.id)
            .eq("role_id", rr.role_id);
        }
      }
    } else {
      await supabase.from("message_reactions").insert({
        message_id: message.id,
        user_id: currentUser.id,
        emoji,
      });

      // Check if this is a reaction role and assign the role
      const { data: rr } = await supabase
        .from("reaction_roles")
        .select("role_id, server_id")
        .eq("message_id", message.id)
        .eq("emoji", emoji)
        .maybeSingle();
      if (rr) {
        const { data: member } = await supabase
          .from("server_members")
          .select("id")
          .eq("server_id", rr.server_id)
          .eq("user_id", currentUser.id)
          .maybeSingle();
        if (member) {
          await supabase
            .from("server_member_roles")
            .upsert({ member_id: member.id, role_id: rr.role_id }, { onConflict: "member_id,role_id" });
        }
      }
    }
    await loadReactions();
  };

  const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "😢", "🔥", "👀"];

  // Filtered emojis for search in full picker
  const filteredEmojis = useMemo(() => {
    if (!emojiSearch.trim()) return EMOJI_CATEGORIES[selectedCategory] || [];
    const q = emojiSearch.toLowerCase();
    return ALL_EMOJIS.filter((e) => e.includes(q));
  }, [emojiSearch, selectedCategory]);

  // Emoji explosion: spawn ~100 animated emojis when hovering a reaction badge
  const triggerExplosion = useCallback((emoji: string, count: number) => {
    const total = Math.min(count * 15, 100);
    const emojis: typeof explosionEmojis = [];
    for (let i = 0; i < total; i++) {
      emojis.push({
        id: Date.now() + i,
        emoji,
        x: Math.random() * 280 - 140,
        y: -(Math.random() * 160 + 40),
        anim: ANIMATION_TYPES[i % ANIMATION_TYPES.length],
      });
    }
    setExplosionEmojis(emojis);
    if (explosionTimeoutRef.current) clearTimeout(explosionTimeoutRef.current);
    explosionTimeoutRef.current = setTimeout(() => setExplosionEmojis([]), 2500);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (explosionTimeoutRef.current) clearTimeout(explosionTimeoutRef.current);
    };
  }, []);

  // Chat bubble color from the message author
  const chatBubbleColor = message.author?.chat_bubble_color;

  return (
    <div
      ref={messageRef}
      className="relative group hover:bg-discord-hover/30 px-2 py-0.5 rounded"
      style={chatBubbleColor ? { backgroundColor: chatBubbleColor + "12" } : undefined}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactPicker(false); setShowFullEmojiPicker(false); setExplosionEmojis([]); }}
    >
      {showHeader ? (
        <div className="flex items-start gap-4 pt-4">
          {message.author ? (
            <UserProfileCard user={message.author} side="right" align="start">
              <div className="relative mt-0.5 shrink-0">
                {authorRing && (
                  <div
                    className={cn("absolute inset-[-3px] rounded-full", authorRing.style === "animated" && "avatar-ring-animated")}
                    style={{
                      background: authorRing.style === "solid" ? authorRing.color1 : `linear-gradient(135deg, ${authorRing.color1}, ${authorRing.color2})`,
                      ...(authorRing.style === "animated" ? { "--ring-c1": authorRing.color1, "--ring-c2": authorRing.color2 } as React.CSSProperties : {}),
                    }}
                  />
                )}
                <Avatar className="w-10 h-10 relative">
                  <AvatarImage src={message.author?.avatar_url || undefined} />
                  <AvatarFallback className="text-sm">
                    {message.author?.display_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
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
                  <span className={cn("font-medium hover:underline cursor-pointer flex items-center gap-1", nameEffectClass)} style={{ ...(roleColor ? { color: roleColor } : { color: "white" }), ...(message.author ? getNameStyle(message.author) : {}) }}>
                    {roleIcon && <span className="text-sm">{roleIcon}</span>}
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
              {message.author?.selected_server_tag && (
                <ServerTagBadge tag={message.author.selected_server_tag} />
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
                {message.content && <FormattedMessage text={message.content} />}
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
                {message.content && <FormattedMessage text={message.content} />}
                {message.is_edited && (
                  <span className="text-[10px] text-discord-muted ml-1">(edited)</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reactions with animation + explosion */}
      {Object.keys(reactions).length > 0 && (
        <div className="relative flex flex-wrap gap-1 pl-14 mt-1">
          {Object.entries(reactions).map(([emoji, data]) => (
            <div
              key={emoji}
              className="relative"
              onMouseEnter={() => {
                setHoveredReaction(emoji);
                triggerExplosion(emoji, data.count);
              }}
              onMouseLeave={() => setHoveredReaction(null)}
            >
              <button
                onClick={() => toggleReaction(emoji)}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all duration-200",
                  data.userReacted
                    ? "bg-discord-brand/20 border-discord-brand/40 text-white"
                    : "bg-discord-darker border-gray-700 text-gray-400 hover:border-gray-500",
                  hoveredReaction === emoji && "scale-110"
                )}
              >
                <span className={cn(
                  "inline-block transition-transform",
                  hoveredReaction === emoji && "animate-reaction-bounce"
                )}>{emoji}</span>
                <span>{data.count}</span>
              </button>
            </div>
          ))}
          {/* Emoji explosion overlay */}
          {explosionEmojis.length > 0 && (
            <div className="absolute inset-0 pointer-events-none overflow-visible z-50">
              {explosionEmojis.map((e) => (
                <span
                  key={e.id}
                  className={cn("absolute text-lg opacity-0", `emoji-${e.anim}`)}
                  style={{
                    left: `calc(50% + ${e.x}px)`,
                    top: `calc(50% + ${e.y}px)`,
                  }}
                >
                  {e.emoji}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {showActions && !isEditing && (
        <div className="absolute -top-3 right-2 flex items-center bg-discord-channel border border-gray-700 rounded shadow-lg">
          {/* React */}
          <div className="relative">
            <button
              onClick={() => { setShowReactPicker(!showReactPicker); setShowFullEmojiPicker(false); }}
              className="p-1.5 hover:bg-discord-hover rounded text-gray-400 hover:text-white"
              title="Add Reaction"
            >
              <SmilePlus className="w-4 h-4" />
            </button>
            {showReactPicker && !showFullEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-1 bg-discord-darker border border-gray-700 rounded-lg shadow-xl p-2 z-50 flex flex-wrap gap-1 max-w-[280px]">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { toggleReaction(emoji); setShowReactPicker(false); }}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-discord-hover text-lg transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  onClick={() => setShowFullEmojiPicker(true)}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-discord-hover text-gray-400 hover:text-white"
                  title="More emojis"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            )}
            {showFullEmojiPicker && (
              <div
                className="absolute bottom-full right-0 mb-1 bg-discord-darker border border-gray-700 rounded-lg shadow-xl z-50 w-[320px] max-h-[380px] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Search */}
                <div className="p-2 border-b border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={emojiSearch}
                      onChange={(e) => setEmojiSearch(e.target.value)}
                      placeholder="Search emojis..."
                      className="w-full bg-discord-dark border border-gray-600 rounded px-7 py-1.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-discord-brand"
                      autoFocus
                    />
                  </div>
                </div>
                {/* Category tabs */}
                {!emojiSearch && (
                  <div className="flex gap-1 px-2 py-1 border-b border-gray-700 overflow-x-auto scrollbar-hide">
                    {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-2 py-0.5 text-xs rounded whitespace-nowrap transition-colors",
                          selectedCategory === cat
                            ? "bg-discord-brand text-white"
                            : "text-gray-400 hover:text-white hover:bg-discord-hover"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                {/* Emoji grid */}
                <div className="flex-1 overflow-y-auto p-2 grid grid-cols-8 gap-0.5 min-h-0">
                  {filteredEmojis.map((emoji, i) => (
                    <button
                      key={`${emoji}-${i}`}
                      onClick={() => {
                        toggleReaction(emoji);
                        setShowFullEmojiPicker(false);
                        setShowReactPicker(false);
                        setEmojiSearch("");
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-discord-hover text-lg transition-transform hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                  {filteredEmojis.length === 0 && (
                    <div className="col-span-8 text-center text-gray-500 text-sm py-4">No emojis found</div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Pin/Unpin */}
          {channelId && currentUser && (
            <button
              onClick={async () => {
                if (isPinned) {
                  await unpinMessage(message.id);
                } else {
                  await pinMessage(message.id, channelId, currentUser.id, isDm);
                }
              }}
              className="p-1.5 hover:bg-discord-hover rounded text-gray-400 hover:text-white"
              title={isPinned ? "Unpin message" : "Pin message"}
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          )}
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
          {/* Report */}
          {!isOwn && onReport && (
            <button
              onClick={() => onReport(message)}
              className="p-1.5 hover:bg-discord-hover rounded text-gray-400 hover:text-orange-400"
              title="Report message"
            >
              <Flag className="w-4 h-4" />
            </button>
          )}
          {isOwn && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 hover:bg-discord-hover rounded text-discord-red hover:text-discord-red-hover"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-discord-darker rounded-lg p-3 my-2">
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={message.author?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {message.author?.display_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{message.author?.display_name}</p>
                <p className="text-sm text-gray-400 break-words">{message.content}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              className="bg-discord-red hover:bg-discord-red-hover text-white"
              onClick={() => {
                deleteMessage(message.id);
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
