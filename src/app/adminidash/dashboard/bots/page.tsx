"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/stores/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Bot as BotIcon, Settings } from "lucide-react";

interface BotData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_bot: boolean;
  bot_owner_id: string | null;
  is_messagable: boolean;
  created_at: string;
}

export default function AdminBotsPage() {
  const { createBot, deleteBot, updateBot } = useAdminStore();
  const [bots, setBots] = useState<BotData[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editBot, setEditBot] = useState<BotData | null>(null);
  const [loading, setLoading] = useState(true);

  // Create form
  const [newBot, setNewBot] = useState({
    username: "",
    display_name: "",
    bio: "",
    is_messagable: false,
  });

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("is_bot", true)
      .order("created_at", { ascending: true });

    if (data) setBots(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    await createBot({
      username: newBot.username,
      display_name: newBot.display_name,
      bio: newBot.bio || undefined,
      is_messagable: newBot.is_messagable,
    });
    setShowCreate(false);
    setNewBot({ username: "", display_name: "", bio: "", is_messagable: false });
    fetchBots();
  };

  const handleDelete = async (botId: string) => {
    if (confirm("Are you sure you want to delete this bot?")) {
      await deleteBot(botId);
      fetchBots();
    }
  };

  const handleUpdate = async () => {
    if (!editBot) return;
    await updateBot(editBot.id, {
      display_name: editBot.display_name,
      about_me: editBot.bio,
      is_messagable: editBot.is_messagable,
    });
    setEditBot(null);
    fetchBots();
  };

  const SYSTEM_BOT_ID = "00000000-0000-0000-0000-000000000001";

  return (
    <div className="p-8 bg-discord-chat min-h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Bot Management</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Create Bot
        </Button>
      </div>

      {/* Bot list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-gray-400 col-span-full text-center py-8">Loading bots...</p>
        ) : bots.length === 0 ? (
          <p className="text-gray-400 col-span-full text-center py-8">No bots created yet.</p>
        ) : (
          bots.map((bot) => (
            <div
              key={bot.id}
              className="bg-discord-dark rounded-lg border border-gray-800 p-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={bot.avatar_url || undefined} />
                    <AvatarFallback className="bg-discord-brand text-white">
                      <BotIcon className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-white font-semibold text-sm">{bot.display_name}</p>
                      <span className="bg-discord-brand text-white text-[9px] px-1 rounded font-semibold">
                        BOT
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">@{bot.username}</p>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => setEditBot(bot)}
                    className="p-1.5 rounded hover:bg-discord-hover text-gray-400 hover:text-white"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  {bot.id !== SYSTEM_BOT_ID && (
                    <button
                      onClick={() => handleDelete(bot.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {bot.bio && <p className="text-xs text-gray-500 mt-2">{bot.bio}</p>}

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {bot.is_messagable ? "Messagable" : "Not messagable"}
                </span>
                {bot.id === SYSTEM_BOT_ID && (
                  <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
                    System Bot
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Bot Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Bot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase">Username</Label>
              <Input
                value={newBot.username}
                onChange={(e) => setNewBot({ ...newBot, username: e.target.value })}
                placeholder="my-bot"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase">Display Name</Label>
              <Input
                value={newBot.display_name}
                onChange={(e) => setNewBot({ ...newBot, display_name: e.target.value })}
                placeholder="My Bot"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase">Bio</Label>
              <Textarea
                value={newBot.bio}
                onChange={(e) => setNewBot({ ...newBot, bio: e.target.value })}
                placeholder="Bot description"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={newBot.is_messagable}
                onCheckedChange={(c) => setNewBot({ ...newBot, is_messagable: c })}
              />
              <Label className="text-sm text-gray-300">Allow users to send messages</Label>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newBot.username || !newBot.display_name}>
                Create Bot
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Bot Dialog */}
      {editBot && (
        <Dialog open={!!editBot} onOpenChange={() => setEditBot(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Bot — {editBot.display_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-gray-300 uppercase">Display Name</Label>
                <Input
                  value={editBot.display_name}
                  onChange={(e) => setEditBot({ ...editBot, display_name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-300 uppercase">Bio</Label>
                <Textarea
                  value={editBot.bio || ""}
                  onChange={(e) => setEditBot({ ...editBot, bio: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editBot.is_messagable}
                  onCheckedChange={(c) => setEditBot({ ...editBot, is_messagable: c })}
                />
                <Label className="text-sm text-gray-300">Allow users to send messages</Label>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setEditBot(null)}>Cancel</Button>
                <Button onClick={handleUpdate}>Save Changes</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
