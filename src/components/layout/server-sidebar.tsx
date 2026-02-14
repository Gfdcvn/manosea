"use client";

import { useRouter, usePathname } from "next/navigation";
import { useServerStore } from "@/stores/server-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Plus, Compass, MessageCircle } from "lucide-react";
import { useState } from "react";
import { CreateServerModal } from "@/components/modals/create-server-modal";

export function ServerSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const servers = useServerStore((s) => s.servers);
  const [showCreateServer, setShowCreateServer] = useState(false);

  const isDmActive = pathname?.startsWith("/channels/me");

  return (
    <>
      <div className="flex flex-col items-center w-[72px] bg-discord-darker py-3 gap-2 shrink-0">
        {/* DMs Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => router.push("/channels/me")}
              className={cn(
                "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all duration-200 hover:rounded-[16px]",
                isDmActive
                  ? "bg-discord-brand rounded-[16px] text-white"
                  : "bg-discord-channel text-gray-300 hover:bg-discord-brand hover:text-white"
              )}
            >
              <MessageCircle className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Direct Messages</TooltipContent>
        </Tooltip>

        <Separator className="w-8 mx-auto" />

        {/* Server List */}
        <ScrollArea className="flex-1 w-full">
          <div className="flex flex-col items-center gap-2 px-3">
            {servers.map((server) => {
              const isActive = pathname?.includes(server.id);
              return (
                <Tooltip key={server.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => router.push(`/channels/${server.id}`)}
                      className={cn(
                        "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all duration-200 hover:rounded-[16px] relative group",
                        isActive
                          ? "bg-discord-brand rounded-[16px] text-white"
                          : "bg-discord-channel text-gray-300 hover:bg-discord-brand hover:text-white"
                      )}
                    >
                      {server.icon_url ? (
                        <img
                          src={server.icon_url}
                          alt={server.name}
                          className="w-full h-full rounded-[inherit] object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold">
                          {server.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      {/* Active indicator */}
                      <div
                        className={cn(
                          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[14px] w-1 rounded-r-full bg-white transition-all",
                          isActive ? "h-10" : "h-0 group-hover:h-5"
                        )}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{server.name}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </ScrollArea>

        <Separator className="w-8 mx-auto" />

        {/* Add Server */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowCreateServer(true)}
              className="w-12 h-12 rounded-[24px] flex items-center justify-center bg-discord-channel text-discord-green hover:bg-discord-green hover:text-white hover:rounded-[16px] transition-all duration-200"
            >
              <Plus className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Add a Server</TooltipContent>
        </Tooltip>

        {/* Explore */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-12 h-12 rounded-[24px] flex items-center justify-center bg-discord-channel text-discord-green hover:bg-discord-green hover:text-white hover:rounded-[16px] transition-all duration-200">
              <Compass className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Explore Public Servers</TooltipContent>
        </Tooltip>
      </div>

      <CreateServerModal open={showCreateServer} onClose={() => setShowCreateServer(false)} />
    </>
  );
}
