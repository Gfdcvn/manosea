"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Full emoji data organized by category
const EMOJI_CATEGORIES = [
  {
    name: "Smileys & People",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍",
      "🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫",
      "🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","😌","😔",
      "😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳",
      "🥸","😎","🤓","🧐","😕","🫤","😟","🙁","😮","😯","😲","😳","🥺","🥹","😦",
      "😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤",
      "😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖",
      "😺","😸","😹","😻","😼","😽","🙀","😿","😾","🙈","🙉","🙊","👋","🤚","🖐️",
      "✋","🖖","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕",
      "👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝",
      "🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁",
      "🦷","🦴","👀","👁️","👅","👄","🫦","👶","🧒","👦","👧","🧑","👱","👨","🧔",
    ],
  },
  {
    name: "Animals & Nature",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷",
      "🐽","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅",
      "🦉","🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰","🪲",
      "🪳","🦟","🦗","🕷️","🕸️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞",
      "🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘",
      "🌸","🌹","🌺","🌻","🌼","🌷","🌱","🌲","🌳","🌴","🌵","🎍","🎋","🍃","🍂","🍁",
    ],
  },
  {
    name: "Food & Drink",
    emojis: [
      "🍇","🍈","🍉","🍊","🍋","🍌","🍍","🥭","🍎","🍏","🍐","🍑","🍒","🍓","🫐",
      "🥝","🍅","🫒","🥥","🥑","🍆","🥔","🥕","🌽","🌶️","🫑","🥒","🥬","🥦","🧄",
      "🧅","🍄","🥜","🫘","🌰","🍞","🥐","🥖","🫓","🥨","🥯","🥞","🧇","🧀","🍖",
      "🍗","🥩","🥓","🍔","🍟","🍕","🌭","🥪","🌮","🌯","🫔","🥙","🧆","🥚","🍳",
      "🥘","🍲","🫕","🥣","🥗","🍿","🧈","🧂","🥫","🍱","🍘","🍙","🍚","🍛","🍜",
      "☕","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾",
    ],
  },
  {
    name: "Activities",
    emojis: [
      "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑",
      "🥍","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷",
      "⛸️","🥌","🎿","⛷️","🏂","🪂","🏋️","🤼","🤸","⛹️","🤺","🤾","🏌️","🏇","🧘",
      "🏄","🏊","🤽","🚣","🧗","🚵","🚴","🏆","🥇","🥈","🥉","🏅","🎖️","🏵️","🎗️",
      "🎫","🎟️","🎪","🤹","🎭","🩰","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🪘","🎷",
      "🎺","🪗","🎸","🪕","🎻","🎲","♟️","🎯","🎳","🎮","🕹️","🎰",
    ],
  },
  {
    name: "Travel & Places",
    emojis: [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️",
      "🛵","🦽","🦼","🛺","🚲","🛴","🛹","🛼","🚏","🛣️","🛤️","🛞","⛽","🚨","🚥",
      "🚦","🛑","🚧","⚓","🛟","⛵","🛶","🚤","🛳️","⛴️","🛥️","🚢","✈️","🛩️","🛫",
      "🛬","🪂","💺","🚁","🚟","🚠","🚡","🛰️","🚀","🛸","🌍","🌎","🌏","🌐","🗺️",
      "🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰",
    ],
  },
  {
    name: "Objects",
    emojis: [
      "⌚","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🖲️","💽","💾","💿","📀","🧮","🎥",
      "📷","📸","📹","📼","🔍","🔎","💡","🔦","🏮","🪔","📔","📕","📖","📗","📘","📙",
      "📚","📓","📒","📃","📜","📄","📰","🗞️","📑","🔖","🏷️","💰","🪙","💴","💵","💶",
      "💷","💸","💳","🧾","💹","✉️","📧","📨","📩","📤","📥","📦","📫","📬","📭","📮",
      "🗳️","✏️","✒️","🖋️","🖊️","🖌️","🖍️","📝","💼","📁","📂","🗂️","📅","📆","🗒️",
    ],
  },
  {
    name: "Symbols",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞",
      "💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️",
      "☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️",
      "🉑","☢️","☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️",
      "㊗️","🈴","🈵","🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔",
      "📛","🚫","💯","💢","♨️","🚷","🚯","🚳","🚱","🔞","📵","🚭","❗","❕","❓","❔",
      "‼️","⁉️","💤","♻️","✅","☑️","✔️","❎","➕","➖","➗","➰","➿","〽️","✳️","✴️","❇️",
    ],
  },
  {
    name: "Flags",
    emojis: [
      "🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️","🇺🇸","🇬🇧","🇫🇷","🇩🇪","🇯🇵",
      "🇰🇷","🇨🇳","🇮🇳","🇧🇷","🇨🇦","🇦🇺","🇪🇸","🇮🇹","🇲🇽","🇷🇺","🇹🇷","🇸🇦",
    ],
  },
];

// Skin tone modifiers
const SKIN_TONES = [
  { name: "Default", modifier: "" },
  { name: "Light", modifier: "🏻" },
  { name: "Medium-Light", modifier: "🏼" },
  { name: "Medium", modifier: "🏽" },
  { name: "Medium-Dark", modifier: "🏾" },
  { name: "Dark", modifier: "🏿" },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const pickerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("recentEmojis");
    if (stored) {
      setRecentEmojis(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Update active category on scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (search) return;
      for (let i = categoryRefs.current.length - 1; i >= 0; i--) {
        const ref = categoryRefs.current[i];
        if (ref) {
          const rect = ref.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (rect.top <= containerRect.top + 40) {
            setActiveCategory(i);
            break;
          }
        }
      }
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [search]);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    const updated = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, 30);
    setRecentEmojis(updated);
    localStorage.setItem("recentEmojis", JSON.stringify(updated));
  };

  const filteredCategories = search
    ? EMOJI_CATEGORIES.map((cat) => ({
        ...cat,
        emojis: cat.emojis.filter((e) => e.includes(search)),
      })).filter((cat) => cat.emojis.length > 0)
    : EMOJI_CATEGORIES;

  return (
    <div
      ref={pickerRef}
      className="w-[352px] h-[400px] bg-discord-channel border border-gray-700 rounded-lg shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Search */}
      <div className="p-2 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-discord-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emoji"
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 px-2 py-1 border-b border-gray-700 overflow-x-auto">
        {EMOJI_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.name}
            onClick={() => {
              setActiveCategory(idx);
              setSearch("");
              categoryRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={`px-2 py-1 text-lg hover:bg-discord-hover rounded transition-colors shrink-0 ${
              activeCategory === idx ? "bg-discord-active" : ""
            }`}
            title={cat.name}
          >
            {cat.emojis[0]}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-2">
        {/* Recent emojis */}
        {!search && recentEmojis.length > 0 && (
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1 px-1">
              Recently Used
            </h3>
            <div className="grid grid-cols-8 gap-0.5">
              {recentEmojis.map((emoji, idx) => (
                <button
                  key={`recent-${idx}`}
                  onClick={() => handleSelect(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-xl hover:bg-discord-hover rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredCategories.map((cat, catIdx) => {
          const originalIdx = EMOJI_CATEGORIES.findIndex((c) => c.name === cat.name);
          return (
          <div key={cat.name} ref={(el) => { categoryRefs.current[originalIdx] = el; }} className="mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1 px-1 sticky top-0 bg-discord-channel">
              {cat.name}
            </h3>
            <div className="grid grid-cols-8 gap-0.5">
              {cat.emojis.map((emoji, idx) => (
                <button
                  key={`${catIdx}-${idx}`}
                  onClick={() => handleSelect(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-xl hover:bg-discord-hover rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          );
        })}
      </div>

      {/* Skin tone selector */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-gray-700">
        <span className="text-xs text-gray-400 mr-1">Skin tone:</span>
        {SKIN_TONES.map((tone) => (
          <button
            key={tone.name}
            title={tone.name}
            className="w-6 h-6 rounded hover:bg-discord-hover flex items-center justify-center text-sm"
          >
            {tone.modifier ? `👋${tone.modifier}` : "👋"}
          </button>
        ))}
      </div>
    </div>
  );
}
