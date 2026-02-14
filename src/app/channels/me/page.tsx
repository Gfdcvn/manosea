"use client";

import { Users } from "lucide-react";
import { FriendsList } from "@/components/friends/friends-list";

export default function DmHomePage() {
  return (
    <div className="flex-1 flex flex-col bg-discord-chat">
      {/* Header */}
      <div className="h-12 border-b border-gray-800 flex items-center px-4 shadow-sm">
        <Users className="w-5 h-5 text-discord-muted mr-2" />
        <span className="text-white font-semibold">Friends</span>
      </div>

      {/* Friends List */}
      <FriendsList />
    </div>
  );
}
