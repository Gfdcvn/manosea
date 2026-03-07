"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { Bot, BotWorkflow } from "@/types";

interface BotLog {
  id: string;
  bot_id: string;
  level: string;
  message: string;
  created_at: string;
}

interface BotStore {
  bots: Bot[];
  currentBot: Bot | null;
  workflows: BotWorkflow[];
  currentWorkflow: BotWorkflow | null;
  logs: BotLog[];
  isLoading: boolean;

  fetchBots: (ownerId: string) => Promise<void>;
  createBot: (ownerId: string, name: string, description?: string) => Promise<Bot | null>;
  deleteBot: (botId: string) => Promise<void>;
  updateBot: (botId: string, data: Partial<Bot>) => Promise<void>;
  setCurrentBot: (bot: Bot | null) => void;

  fetchWorkflows: (botId: string) => Promise<void>;
  createWorkflow: (botId: string, name: string) => Promise<BotWorkflow | null>;
  updateWorkflow: (workflowId: string, data: Partial<BotWorkflow>) => Promise<void>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
  setCurrentWorkflow: (workflow: BotWorkflow | null) => void;

  fetchLogs: (botId: string) => Promise<void>;
  addLog: (botId: string, level: string, message: string) => Promise<void>;
  clearLogs: (botId: string) => Promise<void>;

  toggleBotStatus: (botId: string) => Promise<void>;
}

export const useBotStore = create<BotStore>((set, get) => ({
  bots: [],
  currentBot: null,
  workflows: [],
  currentWorkflow: null,
  logs: [],
  isLoading: false,

  fetchBots: async (ownerId) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("bots")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    set({ bots: (data as Bot[]) || [] });
  },

  createBot: async (ownerId, name, description) => {
    const supabase = createClient();

    // First check bot limit (5 per user, unlimited for superadmin)
    const { data: ownerData } = await supabase.from("users").select("role").eq("id", ownerId).single();
    if (ownerData?.role !== "superadmin") {
      const { count } = await supabase.from("bots").select("id", { count: "exact" }).eq("owner_id", ownerId);
      if ((count || 0) >= 5) return null;
    }

    // Create a bot user account
    const username = `bot_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now().toString(36)}`;
    const { data: botUser, error: userErr } = await supabase
      .from("users")
      .insert({
        id: crypto.randomUUID(),
        email: `${username}@bot.local`,
        username,
        display_name: name,
        status: "online",
        role: "user",
        is_bot: true,
        standing_level: 5,
      })
      .select()
      .single();

    if (userErr || !botUser) return null;

    // Create the bot record
    const { data: bot, error: botErr } = await supabase
      .from("bots")
      .insert({
        user_id: botUser.id,
        owner_id: ownerId,
        name,
        description: description || null,
        status: "offline",
      })
      .select()
      .single();

    if (botErr || !bot) return null;

    // Create default workflow
    await supabase.from("bot_workflows").insert({
      bot_id: bot.id,
      name: "Main Workflow",
      nodes: [],
      connections: [],
      variables: {},
    });

    set({ bots: [bot as Bot, ...get().bots] });
    return bot as Bot;
  },

  deleteBot: async (botId) => {
    const supabase = createClient();
    const bot = get().bots.find((b) => b.id === botId);
    await supabase.from("bots").delete().eq("id", botId);
    // Also delete the bot user account
    if (bot) {
      await supabase.from("users").delete().eq("id", bot.user_id);
    }
    set({
      bots: get().bots.filter((b) => b.id !== botId),
      currentBot: get().currentBot?.id === botId ? null : get().currentBot,
    });
  },

  updateBot: async (botId, data) => {
    const supabase = createClient();
    await supabase.from("bots").update(data).eq("id", botId);
    set({
      bots: get().bots.map((b) => (b.id === botId ? { ...b, ...data } : b)),
      currentBot: get().currentBot?.id === botId ? { ...get().currentBot!, ...data } : get().currentBot,
    });
  },

  setCurrentBot: (bot) => set({ currentBot: bot, workflows: [], currentWorkflow: null, logs: [] }),

  fetchWorkflows: async (botId) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("bot_workflows")
      .select("*")
      .eq("bot_id", botId)
      .order("created_at");
    set({ workflows: (data as BotWorkflow[]) || [] });
  },

  createWorkflow: async (botId, name) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("bot_workflows")
      .insert({ bot_id: botId, name, nodes: [], connections: [], variables: {} })
      .select()
      .single();
    if (data) {
      set({ workflows: [...get().workflows, data as BotWorkflow] });
      return data as BotWorkflow;
    }
    return null;
  },

  updateWorkflow: async (workflowId, data) => {
    const supabase = createClient();
    await supabase.from("bot_workflows").update({ ...data, updated_at: new Date().toISOString() }).eq("id", workflowId);
    set({
      workflows: get().workflows.map((w) => (w.id === workflowId ? { ...w, ...data } : w)),
      currentWorkflow: get().currentWorkflow?.id === workflowId ? { ...get().currentWorkflow!, ...data } : get().currentWorkflow,
    });
  },

  deleteWorkflow: async (workflowId) => {
    const supabase = createClient();
    await supabase.from("bot_workflows").delete().eq("id", workflowId);
    set({ workflows: get().workflows.filter((w) => w.id !== workflowId) });
  },

  setCurrentWorkflow: (workflow) => set({ currentWorkflow: workflow }),

  fetchLogs: async (botId) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("bot_logs")
      .select("*")
      .eq("bot_id", botId)
      .order("created_at", { ascending: false })
      .limit(200);
    set({ logs: (data as BotLog[]) || [] });
  },

  addLog: async (botId, level, message) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("bot_logs")
      .insert({ bot_id: botId, level, message })
      .select()
      .single();
    if (data) {
      set({ logs: [data as BotLog, ...get().logs].slice(0, 200) });
    }
  },

  clearLogs: async (botId) => {
    const supabase = createClient();
    await supabase.from("bot_logs").delete().eq("bot_id", botId);
    set({ logs: [] });
  },

  toggleBotStatus: async (botId) => {
    const bot = get().bots.find((b) => b.id === botId);
    if (!bot) return;
    const newStatus = bot.status === "online" ? "offline" : "online";
    await get().updateBot(botId, { status: newStatus });
  },
}));
