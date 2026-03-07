"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useBotStore } from "@/stores/bot-store";
import { Bot } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  Bot as BotIcon,
  Power,
  PowerOff,
  Trash2,
  Pencil,
  Circle,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function DevsPage() {
  const user = useAuthStore((s) => s.user);
  const { bots, fetchBots, createBot, deleteBot, toggleBotStatus, updateBot } = useBotStore();
  const router = useRouter();

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Bot | null>(null);
  const [showDelete, setShowDelete] = useState<Bot | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const isSuperAdmin = user?.role === "superadmin";
  const atLimit = !isSuperAdmin && bots.length >= 5;

  useEffect(() => {
    if (user) fetchBots(user.id);
  }, [user, fetchBots]);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    const bot = await createBot(user.id, name.trim(), description.trim());
    if (bot) {
      setShowCreate(false);
      setName("");
      setDescription("");
    }
  };

  const handleEdit = async () => {
    if (!showEdit || !editName.trim()) return;
    await updateBot(showEdit.id, { name: editName.trim(), description: editDesc.trim() || null });
    setShowEdit(null);
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    await deleteBot(showDelete.id);
    setShowDelete(null);
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 bg-discord-sidebar border-b border-[var(--rc-border)]">
        <Link href="/channels/me" className="text-discord-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-discord-brand flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold">Bot Developer Portal</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-discord-muted">
            {bots.length}{isSuperAdmin ? "" : "/5"} bots
          </span>
          <Button
            onClick={() => setShowCreate(true)}
            disabled={atLimit}
            className="bg-discord-brand hover:bg-discord-brand-hover text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            New Bot
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {bots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="w-24 h-24 rounded-full bg-discord-channel flex items-center justify-center">
              <BotIcon className="w-12 h-12 text-discord-muted" />
            </div>
            <h2 className="text-2xl font-bold">No bots yet</h2>
            <p className="text-discord-muted max-w-md">
              Create your first bot and use the visual workflow editor to bring it to life.
              No coding required!
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-discord-brand hover:bg-discord-brand-hover text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Bot
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="group relative bg-discord-channel rounded-xl border border-[var(--rc-border)] hover:border-discord-brand/40 transition-all hover:shadow-lg hover:shadow-discord-brand/5 overflow-hidden"
              >
                {/* Bot gradient header */}
                <div className="h-20 bg-gradient-to-br from-discord-brand/30 to-purple-600/20 relative">
                  <div className="absolute -bottom-6 left-4">
                    <div className="w-14 h-14 rounded-xl bg-discord-dark border-4 border-discord-channel flex items-center justify-center overflow-hidden">
                      {bot.avatar_url ? (
                        <img src={bot.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <BotIcon className="w-7 h-7 text-discord-brand" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-8 px-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg truncate">{bot.name}</h3>
                        <span className="text-[10px] font-bold bg-discord-brand/20 text-discord-brand px-1.5 py-0.5 rounded uppercase">
                          bot
                        </span>
                      </div>
                      <p className="text-sm text-discord-muted mt-0.5 line-clamp-2">
                        {bot.description || "No description"}
                      </p>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center gap-2 mt-3">
                    <Circle
                      className={`w-3 h-3 fill-current ${
                        bot.status === "online"
                          ? "text-discord-green"
                          : bot.status === "error"
                          ? "text-discord-red"
                          : "text-discord-muted"
                      }`}
                    />
                    <span className="text-xs text-discord-muted capitalize">{bot.status}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--rc-border)]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/devs/${bot.id}`)}
                      className="flex-1 text-xs gap-1.5 hover:bg-discord-brand/10 hover:text-discord-brand"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      Workflow Editor
                    </Button>
                    <button
                      onClick={() => toggleBotStatus(bot.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        bot.status === "online"
                          ? "text-discord-green hover:bg-discord-green/10"
                          : "text-discord-muted hover:bg-discord-hover"
                      }`}
                      title={bot.status === "online" ? "Shut down" : "Start"}
                    >
                      {bot.status === "online" ? (
                        <Power className="w-4 h-4" />
                      ) : (
                        <PowerOff className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => { setEditName(bot.name); setEditDesc(bot.description || ""); setShowEdit(bot); }}
                      className="p-2 rounded-lg text-discord-muted hover:text-foreground hover:bg-discord-hover transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDelete(bot)}
                      className="p-2 rounded-lg text-discord-muted hover:text-discord-red hover:bg-discord-red/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Bot Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-discord-channel border-[var(--rc-border)]">
          <DialogHeader>
            <DialogTitle>Create a Bot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-discord-muted mb-1.5 block">
                Bot Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Bot"
                maxLength={32}
                className="bg-discord-input border-[var(--rc-border)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-discord-muted mb-1.5 block">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your bot do?"
                maxLength={200}
                rows={3}
                className="bg-discord-input border-[var(--rc-border)] resize-none"
              />
            </div>
            {atLimit && (
              <p className="text-sm text-discord-red">
                You&apos;ve reached the maximum of 5 bots.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || atLimit}
              className="bg-discord-brand hover:bg-discord-brand-hover text-white"
            >
              Create Bot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bot Dialog */}
      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent className="bg-discord-channel border-[var(--rc-border)]">
          <DialogHeader>
            <DialogTitle>Edit Bot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-discord-muted mb-1.5 block">
                Bot Name
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={32}
                className="bg-discord-input border-[var(--rc-border)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-discord-muted mb-1.5 block">
                Description
              </label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                maxLength={200}
                rows={3}
                className="bg-discord-input border-[var(--rc-border)] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEdit(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!editName.trim()}
              className="bg-discord-brand hover:bg-discord-brand-hover text-white"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="bg-discord-channel border-[var(--rc-border)]">
          <DialogHeader>
            <DialogTitle>Delete Bot</DialogTitle>
          </DialogHeader>
          <p className="text-discord-muted">
            Are you sure you want to delete <strong className="text-foreground">{showDelete?.name}</strong>?
            This action cannot be undone. All workflows and logs will be permanently deleted.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDelete(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-discord-red hover:bg-discord-red-hover text-white"
            >
              Delete Bot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
