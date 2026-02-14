"use client";

import { DmSidebar } from "@/components/layout/dm-sidebar";
import { UserPanel } from "@/components/layout/user-panel";

export default function DmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <div className="w-60 bg-discord-channel flex flex-col">
        <div className="h-12 border-b border-gray-800 flex items-center px-4 shadow-sm">
          <input
            className="w-full bg-discord-darker rounded-md px-2 py-1 text-sm text-gray-300 placeholder:text-discord-muted outline-none"
            placeholder="Find or start a conversation"
          />
        </div>
        <DmSidebar />
        <UserPanel />
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
