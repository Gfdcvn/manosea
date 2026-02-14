"use client";

import { useRouter, usePathname } from "next/navigation";
import { useServerStore } from "@/stores/server-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Hash, Volume2, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";

interface ChannelSidebarProps {
  serverId: string;
}

export function ChannelSidebar({ serverId }: ChannelSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { channels, categories, createChannel, createCategory } = useServerStore();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleCreateInvite = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const code = generateInviteCode();
    await supabase.from("server_invites").insert({
      server_id: serverId,
      code,
      created_by: user.id,
    });

    navigator.clipboard.writeText(code);
    alert(`Invite code copied: ${code}`);
  };

  // Group channels by category
  const uncategorized = channels.filter((c) => !c.category_id);
  const categorizedChannels = categories.map((cat) => ({
    category: cat,
    channels: channels.filter((c) => c.category_id === cat.id),
  }));

  return (
    <ScrollArea className="flex-1">
      <div className="px-2 py-2">
        {/* Server actions */}
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full text-left px-2 py-1 rounded hover:bg-discord-hover text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between group">
            <span>Channels</span>
            <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                const name = prompt("Channel name (lowercase, no spaces):");
                if (name) createChannel(serverId, name.toLowerCase().replace(/\s+/g, "-"), "text");
              }}
            >
              <Hash className="w-4 h-4 mr-2" />
              Create Text Channel
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const name = prompt("Voice channel name:");
                if (name) createChannel(serverId, name.toLowerCase().replace(/\s+/g, "-"), "voice");
              }}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Create Voice Channel
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const name = prompt("Category name:");
                if (name) createCategory(serverId, name);
              }}
            >
              Create Category
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateInvite}>
              Create Invite
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Uncategorized channels */}
        <div className="mt-1 space-y-0.5">
          {uncategorized.map((channel) => (
            <ChannelButton
              key={channel.id}
              channel={channel}
              isActive={pathname?.includes(channel.id) || false}
              onClick={() => router.push(`/channels/${serverId}/${channel.id}`)}
            />
          ))}
        </div>

        {/* Categorized channels */}
        {categorizedChannels.map(({ category, channels: catChannels }) => (
          <div key={category.id} className="mt-4">
            <button
              onClick={() => toggleCategory(category.id)}
              className="flex items-center gap-0.5 px-0.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 w-full"
            >
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform",
                  collapsedCategories.has(category.id) && "-rotate-90"
                )}
              />
              {category.name}
            </button>
            {!collapsedCategories.has(category.id) && (
              <div className="mt-1 space-y-0.5">
                {catChannels.map((channel) => (
                  <ChannelButton
                    key={channel.id}
                    channel={channel}
                    isActive={pathname?.includes(channel.id) || false}
                    onClick={() => router.push(`/channels/${serverId}/${channel.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function ChannelButton({
  channel,
  isActive,
  onClick,
}: {
  channel: { type: string; name: string };
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors group",
        isActive
          ? "bg-discord-active text-white"
          : "text-gray-400 hover:text-gray-200 hover:bg-discord-hover"
      )}
    >
      {channel.type === "voice" ? (
        <Volume2 className="w-4 h-4 shrink-0" />
      ) : (
        <Hash className="w-4 h-4 shrink-0" />
      )}
      <span className="truncate">{channel.name}</span>
    </button>
  );
}
