"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useBotStore } from "@/stores/bot-store";
import { BotNode, BotConnection, BotWorkflow } from "@/types";
import { NodeEditorCanvas } from "@/components/bot/node-editor-canvas";
import Link from "next/link";
import {
  ArrowLeft,
  Bot as BotIcon,
  Power,
  PowerOff,
  Circle,
  Plus,
  ScrollText,
  X,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function BotEditorPage() {
  const params = useParams();
  const botId = params.botId as string;
  const user = useAuthStore((s) => s.user);
  const {
    bots,
    currentBot,
    setCurrentBot,
    fetchBots,
    toggleBotStatus,
    workflows,
    currentWorkflow,
    setCurrentWorkflow,
    fetchWorkflows,
    updateWorkflow,
    createWorkflow,
    deleteWorkflow,
    logs,
    fetchLogs,
    clearLogs,
  } = useBotStore();

  const [showLogs, setShowLogs] = useState(false);
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [newWfName, setNewWfName] = useState("");
  const [copiedToken, setCopiedToken] = useState(false);

  // Load bot and workflows
  useEffect(() => {
    if (user && bots.length === 0) fetchBots(user.id);
  }, [user, bots.length, fetchBots]);

  useEffect(() => {
    const bot = bots.find((b) => b.id === botId);
    if (bot) setCurrentBot(bot);
  }, [bots, botId, setCurrentBot]);

  useEffect(() => {
    if (currentBot) {
      fetchWorkflows(currentBot.id);
      fetchLogs(currentBot.id);
    }
  }, [currentBot, fetchWorkflows, fetchLogs]);

  useEffect(() => {
    if (workflows.length > 0 && !currentWorkflow) {
      setCurrentWorkflow(workflows[0]);
    }
  }, [workflows, currentWorkflow, setCurrentWorkflow]);

  const handleSave = useCallback(
    (nodes: BotNode[], connections: BotConnection[]) => {
      if (!currentWorkflow) return;
      updateWorkflow(currentWorkflow.id, { nodes, connections });
    },
    [currentWorkflow, updateWorkflow]
  );

  const handleCreateWorkflow = async () => {
    if (!currentBot || !newWfName.trim()) return;
    const wf = await createWorkflow(currentBot.id, newWfName.trim());
    if (wf) {
      setCurrentWorkflow(wf);
      setShowNewWorkflow(false);
      setNewWfName("");
    }
  };

  const handleDeleteWorkflow = async (wf: BotWorkflow) => {
    if (workflows.length <= 1) return;
    await deleteWorkflow(wf.id);
    if (currentWorkflow?.id === wf.id) {
      setCurrentWorkflow(workflows.find((w) => w.id !== wf.id) || null);
    }
  };

  const copyToken = () => {
    if (!currentBot) return;
    navigator.clipboard.writeText(currentBot.token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  if (!currentBot) {
    return (
      <div className="h-screen flex items-center justify-center bg-discord-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-discord-brand border-t-transparent animate-spin" />
          <p className="text-discord-muted">Loading bot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-discord-sidebar border-b border-[var(--rc-border)] shrink-0">
        <Link href="/devs" className="text-discord-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Bot info */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-discord-dark flex items-center justify-center overflow-hidden">
            {currentBot.avatar_url ? (
              <img src={currentBot.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <BotIcon className="w-4 h-4 text-discord-brand" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm">{currentBot.name}</span>
              <span className="text-[9px] font-bold bg-discord-brand/20 text-discord-brand px-1 py-0.5 rounded uppercase">bot</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className={`w-2 h-2 fill-current ${currentBot.status === "online" ? "text-discord-green" : "text-discord-muted"}`} />
              <span className="text-[10px] text-discord-muted capitalize">{currentBot.status}</span>
            </div>
          </div>
        </div>

        {/* Workflow tabs */}
        <div className="flex items-center gap-1 ml-4 overflow-x-auto">
          {workflows.map((wf) => (
            <button
              key={wf.id}
              onClick={() => setCurrentWorkflow(wf)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                currentWorkflow?.id === wf.id
                  ? "bg-discord-brand text-white"
                  : "text-discord-muted hover:bg-discord-hover hover:text-foreground"
              }`}
            >
              {wf.name}
              {workflows.length > 1 && (
                <X
                  className="w-3 h-3 opacity-50 hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(wf); }}
                />
              )}
            </button>
          ))}
          <button
            onClick={() => setShowNewWorkflow(true)}
            className="p-1.5 rounded-md text-discord-muted hover:bg-discord-hover hover:text-foreground transition-colors"
            title="New workflow"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={copyToken}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-discord-muted hover:text-foreground hover:bg-discord-hover rounded-md transition-colors"
            title="Copy bot token"
          >
            {copiedToken ? <Check className="w-3.5 h-3.5 text-discord-green" /> : <Copy className="w-3.5 h-3.5" />}
            Token
          </button>
          <button
            onClick={() => setShowLogs(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-discord-muted hover:text-foreground hover:bg-discord-hover rounded-md transition-colors"
          >
            <ScrollText className="w-3.5 h-3.5" />
            Logs
          </button>
          <button
            onClick={() => toggleBotStatus(currentBot.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
              currentBot.status === "online"
                ? "bg-discord-green/10 text-discord-green hover:bg-discord-green/20"
                : "bg-discord-hover text-discord-muted hover:text-foreground"
            }`}
          >
            {currentBot.status === "online" ? (
              <>
                <Power className="w-3.5 h-3.5" />
                Online
              </>
            ) : (
              <>
                <PowerOff className="w-3.5 h-3.5" />
                Start Bot
              </>
            )}
          </button>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        {currentWorkflow ? (
          <NodeEditorCanvas key={currentWorkflow.id} workflow={currentWorkflow} onSave={handleSave} />
        ) : (
          <div className="h-full flex items-center justify-center text-discord-muted">
            No workflow selected
          </div>
        )}
      </div>

      {/* Logs Dialog */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="bg-discord-channel border-[var(--rc-border)] max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Bot Logs</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { clearLogs(currentBot.id); }}
                className="text-xs text-discord-muted"
              >
                Clear
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-discord-darker rounded-md p-3 font-mono text-xs space-y-0.5 max-h-96">
            {logs.length === 0 ? (
              <p className="text-discord-muted text-center py-8">No logs yet</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-discord-muted whitespace-nowrap">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                  <span
                    className={`font-bold uppercase w-12 shrink-0 ${
                      log.level === "error"
                        ? "text-discord-red"
                        : log.level === "warn"
                        ? "text-discord-yellow"
                        : log.level === "debug"
                        ? "text-violet-400"
                        : "text-discord-green"
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-foreground/80 break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Workflow Dialog */}
      <Dialog open={showNewWorkflow} onOpenChange={setShowNewWorkflow}>
        <DialogContent className="bg-discord-channel border-[var(--rc-border)]">
          <DialogHeader>
            <DialogTitle>New Workflow</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-xs font-semibold uppercase text-discord-muted mb-1.5 block">
              Workflow Name
            </label>
            <Input
              value={newWfName}
              onChange={(e) => setNewWfName(e.target.value)}
              placeholder="My Workflow"
              maxLength={32}
              className="bg-discord-input border-[var(--rc-border)]"
              onKeyDown={(e) => e.key === "Enter" && handleCreateWorkflow()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewWorkflow(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkflow}
              disabled={!newWfName.trim()}
              className="bg-discord-brand hover:bg-discord-brand-hover text-white"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
