import { BotNode, BotConnection, BotWorkflow, NodeType } from "@/types";
import { createClient } from "@/lib/supabase/client";

// ====== Bot Runtime Engine ======
// Executes workflows by traversing the node graph from trigger nodes

type Context = {
  botId: string;
  workflowId: string;
  serverId?: string;
  channelId?: string;
  userId?: string;
  messageId?: string;
  messageContent?: string;
  variables: Record<string, string>;
};

function getConnectedNodes(
  nodeId: string,
  port: string,
  connections: BotConnection[],
  nodes: BotNode[]
): BotNode[] {
  return connections
    .filter((c) => c.sourceNodeId === nodeId && c.sourcePort === port)
    .map((c) => nodes.find((n) => n.id === c.targetNodeId))
    .filter(Boolean) as BotNode[];
}

async function addLog(botId: string, level: string, message: string) {
  const supabase = createClient();
  await supabase.from("bot_logs").insert({ bot_id: botId, level, message });
}

function interpolate(template: string, ctx: Context): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key === "user" || key === "user_id") return ctx.userId || "";
    if (key === "channel" || key === "channel_id") return ctx.channelId || "";
    if (key === "message" || key === "content") return ctx.messageContent || "";
    if (key === "server" || key === "server_id") return ctx.serverId || "";
    if (key === "message_id") return ctx.messageId || "";
    if (key === "timestamp") return new Date().toISOString();
    return ctx.variables[key] || "";
  });
}

// Execute a single node and follow its outputs
async function executeNode(
  node: BotNode,
  workflow: BotWorkflow,
  ctx: Context,
  depth: number = 0
): Promise<void> {
  if (depth > 50) {
    await addLog(ctx.botId, "error", `Max depth reached at node ${node.type}`);
    return;
  }

  const supabase = createClient();

  try {
    let nextPort = "out";

    switch (node.type) {
      // ===== Messaging =====
      case "action_send_message": {
        const channelId = interpolate((node.data.channel_id as string) || ctx.channelId || "", ctx);
        const content = interpolate((node.data.content as string) || "", ctx);
        if (channelId && content) {
          const { data: bot } = await supabase.from("bots").select("user_id").eq("id", ctx.botId).single();
          if (bot) {
            // Detect if this is a DM context (no serverId means DM)
            const isDm = !ctx.serverId;
            const msgData: Record<string, string> = { author_id: bot.user_id, content };
            if (isDm) {
              msgData.dm_channel_id = channelId;
            } else {
              msgData.channel_id = channelId;
            }
            await supabase.from("messages").insert(msgData);
          }
        }
        break;
      }
      case "action_reply": {
        const content = interpolate((node.data.content as string) || "", ctx);
        if (ctx.channelId && content) {
          const { data: bot } = await supabase.from("bots").select("user_id").eq("id", ctx.botId).single();
          if (bot) {
            const isDm = !ctx.serverId;
            const msgData: Record<string, string | null> = {
              author_id: bot.user_id,
              content,
              reply_to_id: ctx.messageId || null,
            };
            if (isDm) {
              msgData.dm_channel_id = ctx.channelId;
            } else {
              msgData.channel_id = ctx.channelId;
            }
            await supabase.from("messages").insert(msgData);
          }
        }
        break;
      }
      case "action_send_dm": {
        const content = interpolate((node.data.content as string) || "", ctx);
        if (ctx.userId && content) {
          const { data: bot } = await supabase.from("bots").select("user_id").eq("id", ctx.botId).single();
          if (bot) {
            // Find or create DM channel
            const { data: existing } = await supabase
              .from("dm_channels")
              .select("id")
              .or(`and(user1_id.eq.${bot.user_id},user2_id.eq.${ctx.userId}),and(user1_id.eq.${ctx.userId},user2_id.eq.${bot.user_id})`)
              .single();
            let dmChannelId = existing?.id;
            if (!dmChannelId) {
              const { data: newDm } = await supabase
                .from("dm_channels")
                .insert({ user1_id: bot.user_id, user2_id: ctx.userId })
                .select("id")
                .single();
              dmChannelId = newDm?.id;
            }
            if (dmChannelId) {
              await supabase.from("messages").insert({ dm_channel_id: dmChannelId, author_id: bot.user_id, content });
            }
          }
        }
        break;
      }
      case "action_delete_message": {
        if (ctx.messageId) {
          await supabase.from("messages").delete().eq("id", ctx.messageId);
        }
        break;
      }
      case "action_add_reaction": {
        const emoji = (node.data.emoji as string) || "👍";
        if (ctx.messageId) {
          const { data: bot } = await supabase.from("bots").select("user_id").eq("id", ctx.botId).single();
          if (bot) {
            await supabase.from("reactions").insert({ message_id: ctx.messageId, user_id: bot.user_id, emoji });
          }
        }
        break;
      }
      case "action_pin_message": {
        if (ctx.messageId) {
          await supabase.from("messages").update({ is_pinned: true }).eq("id", ctx.messageId);
        }
        break;
      }
      case "action_edit_message":
      case "action_send_embed":
      case "action_send_button": {
        // Simplified — send as regular message with formatted content
        const content = interpolate((node.data.content as string) || (node.data.description as string) || "", ctx);
        if (ctx.channelId && content) {
          const { data: bot } = await supabase.from("bots").select("user_id").eq("id", ctx.botId).single();
          if (bot) {
            await supabase.from("messages").insert({ channel_id: ctx.channelId, user_id: bot.user_id, content });
          }
        }
        break;
      }

      // ===== Server management =====
      case "action_create_channel": {
        const name = interpolate((node.data.name as string) || "new-channel", ctx);
        if (ctx.serverId) {
          await supabase.from("channels").insert({ server_id: ctx.serverId, name, type: "text" });
        }
        break;
      }
      case "action_delete_channel": {
        const channelId = interpolate((node.data.channel_id as string) || "", ctx);
        if (channelId) {
          await supabase.from("channels").delete().eq("id", channelId);
        }
        break;
      }
      case "action_rename_channel": {
        const channelId = interpolate((node.data.channel_id as string) || "", ctx);
        const name = interpolate((node.data.name as string) || "", ctx);
        if (channelId && name) {
          await supabase.from("channels").update({ name }).eq("id", channelId);
        }
        break;
      }
      case "action_assign_role": {
        const roleId = (node.data.role_id as string) || "";
        if (ctx.userId && ctx.serverId && roleId) {
          await supabase.from("server_member_roles").insert({ server_id: ctx.serverId, user_id: ctx.userId, role_id: roleId });
        }
        break;
      }
      case "action_remove_role": {
        const roleId = (node.data.role_id as string) || "";
        if (ctx.userId && ctx.serverId && roleId) {
          await supabase.from("server_member_roles").delete().match({ server_id: ctx.serverId, user_id: ctx.userId, role_id: roleId });
        }
        break;
      }
      case "action_kick_user": {
        if (ctx.userId && ctx.serverId) {
          await supabase.from("server_members").delete().match({ server_id: ctx.serverId, user_id: ctx.userId });
        }
        break;
      }
      case "action_ban_user": {
        if (ctx.userId && ctx.serverId) {
          await supabase.from("server_members").delete().match({ server_id: ctx.serverId, user_id: ctx.userId });
          await supabase.from("server_bans").insert({ server_id: ctx.serverId, user_id: ctx.userId, reason: (node.data.reason as string) || "Banned by bot" });
        }
        break;
      }
      case "action_mute_user":
      case "action_set_nickname": {
        // Simplified — log the action
        await addLog(ctx.botId, "info", `${node.type}: user=${ctx.userId}`);
        break;
      }

      // ===== Logic =====
      case "action_add_delay": {
        const seconds = parseInt((node.data.seconds as string) || "1", 10);
        await new Promise((r) => setTimeout(r, Math.min(seconds, 30) * 1000));
        break;
      }
      case "action_condition": {
        const variable = interpolate((node.data.variable as string) || "", ctx);
        const operator = (node.data.operator as string) || "==";
        const value = interpolate((node.data.value as string) || "", ctx);
        let result = false;
        switch (operator) {
          case "==": result = variable === value; break;
          case "!=": result = variable !== value; break;
          case ">": result = parseFloat(variable) > parseFloat(value); break;
          case "<": result = parseFloat(variable) < parseFloat(value); break;
          case "contains": result = variable.includes(value); break;
          case "starts_with": result = variable.startsWith(value); break;
          case "ends_with": result = variable.endsWith(value); break;
        }
        nextPort = result ? "true" : "false";
        break;
      }
      case "action_random_choice": {
        const choices = ((node.data.choices as string) || "").split("\n").filter(Boolean);
        if (choices.length > 0) {
          const pick = choices[Math.floor(Math.random() * choices.length)];
          ctx.variables["random_result"] = pick;
        }
        break;
      }
      case "action_loop": {
        const count = parseInt((node.data.count as string) || "1", 10);
        const bodyNodes = getConnectedNodes(node.id, "body", workflow.connections, workflow.nodes);
        for (let i = 0; i < Math.min(count, 100); i++) {
          ctx.variables["loop_index"] = String(i);
          for (const bodyNode of bodyNodes) {
            await executeNode(bodyNode, workflow, ctx, depth + 1);
          }
        }
        nextPort = "done";
        break;
      }

      // ===== Data =====
      case "action_set_variable": {
        const varName = (node.data.var_name as string) || "";
        const varValue = interpolate((node.data.var_value as string) || "", ctx);
        if (varName) {
          ctx.variables[varName] = varValue;
          // Persist to bot_memory
          await supabase.from("bot_memory").upsert({ bot_id: ctx.botId, key: varName, value: varValue }, { onConflict: "bot_id,key" });
        }
        break;
      }
      case "action_get_variable": {
        const varName = (node.data.var_name as string) || "";
        if (varName) {
          const { data } = await supabase.from("bot_memory").select("value").eq("bot_id", ctx.botId).eq("key", varName).single();
          if (data) ctx.variables[varName] = data.value;
        }
        break;
      }
      case "action_log": {
        const message = interpolate((node.data.message as string) || "", ctx);
        await addLog(ctx.botId, "info", message);
        break;
      }
      case "action_counter": {
        const varName = (node.data.var_name as string) || "counter";
        const op = (node.data.operation as string) || "increment";
        const current = parseInt(ctx.variables[varName] || "0", 10);
        const newVal = op === "increment" ? current + 1 : op === "decrement" ? current - 1 : 0;
        ctx.variables[varName] = String(newVal);
        await supabase.from("bot_memory").upsert({ bot_id: ctx.botId, key: varName, value: String(newVal) }, { onConflict: "bot_id,key" });
        break;
      }
      case "action_math": {
        const expr = interpolate((node.data.expression as string) || "0", ctx);
        // Safe simple math: only allow digits, spaces, and basic operators
        if (/^[\d\s+\-*/().]+$/.test(expr)) {
          try {
            // Use Function constructor for safe evaluation of numeric expressions
            const fn = new Function(`"use strict"; return (${expr});`);
            ctx.variables["math_result"] = String(fn());
          } catch {
            ctx.variables["math_result"] = "NaN";
          }
        }
        break;
      }
      case "action_string_format": {
        const template = (node.data.template as string) || "";
        ctx.variables["format_result"] = interpolate(template, ctx);
        break;
      }
      case "action_http_request": {
        // Disabled for security in client-side execution — would need a server API
        await addLog(ctx.botId, "warn", "HTTP requests require server-side execution");
        break;
      }
      case "action_json_parse": {
        await addLog(ctx.botId, "warn", "JSON parse requires server-side execution");
        break;
      }

      // ===== New Nodes =====
      case "action_send_typing": {
        const duration = Math.min(parseInt((node.data.duration as string) || "3", 10), 10);
        await addLog(ctx.botId, "info", `Typing indicator for ${duration}s in ${ctx.channelId}`);
        await new Promise((r) => setTimeout(r, duration * 1000));
        break;
      }
      case "action_switch": {
        const switchVar = interpolate((node.data.variable as string) || "", ctx);
        const case1 = interpolate((node.data.case_1 as string) || "", ctx);
        const case2 = interpolate((node.data.case_2 as string) || "", ctx);
        const case3 = interpolate((node.data.case_3 as string) || "", ctx);
        if (switchVar === case1) { nextPort = "case_1"; ctx.variables["matched_case"] = "1"; }
        else if (switchVar === case2) { nextPort = "case_2"; ctx.variables["matched_case"] = "2"; }
        else if (switchVar === case3) { nextPort = "case_3"; ctx.variables["matched_case"] = "3"; }
        else { nextPort = "default"; ctx.variables["matched_case"] = "default"; }
        break;
      }
      case "action_foreach": {
        const listVar = interpolate((node.data.list_var as string) || "", ctx);
        const separator = (node.data.separator as string) || ",";
        const items = listVar.split(separator).map((s) => s.trim()).filter(Boolean);
        const bodyNodes = getConnectedNodes(node.id, "body", workflow.connections, workflow.nodes);
        for (let i = 0; i < Math.min(items.length, 100); i++) {
          ctx.variables["item"] = items[i];
          ctx.variables["index"] = String(i);
          for (const bodyNode of bodyNodes) {
            await executeNode(bodyNode, workflow, ctx, depth + 1);
          }
        }
        nextPort = "done";
        break;
      }
      case "action_cooldown": {
        const seconds = parseInt((node.data.seconds as string) || "30", 10);
        const per = (node.data.per as string) || "user";
        const key = `cooldown_${node.id}_${per === "user" ? ctx.userId : per === "channel" ? ctx.channelId : "global"}`;
        const { data: mem } = await supabase.from("bot_memory").select("value").eq("bot_id", ctx.botId).eq("key", key).single();
        const lastUsed = mem ? parseInt(mem.value, 10) : 0;
        const now = Date.now();
        const remaining = Math.max(0, seconds - Math.floor((now - lastUsed) / 1000));
        ctx.variables["remaining"] = String(remaining);
        if (remaining > 0) {
          nextPort = "blocked";
        } else {
          await supabase.from("bot_memory").upsert({ bot_id: ctx.botId, key, value: String(now) }, { onConflict: "bot_id,key" });
          nextPort = "allowed";
        }
        break;
      }
      case "action_wait_for_message": {
        // Simplified: log that we're waiting — real implementation would need pub/sub
        await addLog(ctx.botId, "info", "Wait for message: requires realtime subscription");
        ctx.variables["response_content"] = "";
        ctx.variables["response_user"] = "";
        nextPort = "timeout";
        break;
      }
      case "action_regex_match": {
        const input = interpolate((node.data.input as string) || "", ctx);
        const pattern = (node.data.pattern as string) || "";
        const flags = (node.data.flags as string) || "";
        try {
          const re = new RegExp(pattern, flags);
          const m = re.exec(input);
          if (m) {
            ctx.variables["match"] = m[0];
            if (m[1]) ctx.variables["group_1"] = m[1];
            if (m[2]) ctx.variables["group_2"] = m[2];
            nextPort = "match";
          } else {
            ctx.variables["match"] = "";
            nextPort = "no_match";
          }
        } catch {
          await addLog(ctx.botId, "error", `Invalid regex: ${pattern}`);
          nextPort = "no_match";
        }
        break;
      }
      case "action_store_list": {
        const listName = (node.data.list_name as string) || "list";
        const operation = (node.data.operation as string) || "push";
        const item = interpolate((node.data.item as string) || "", ctx);
        // Load list from memory
        const { data: listMem } = await supabase.from("bot_memory").select("value").eq("bot_id", ctx.botId).eq("key", listName).single();
        let items: string[] = [];
        try { items = JSON.parse(listMem?.value || "[]"); } catch { items = []; }
        let popped = "";
        switch (operation) {
          case "push": items.push(item); break;
          case "pop": popped = items.pop() || ""; break;
          case "shift": popped = items.shift() || ""; break;
          case "clear": items = []; break;
          case "includes": ctx.variables["list_includes"] = String(items.includes(item)); break;
        }
        ctx.variables["list_length"] = String(items.length);
        ctx.variables["list_value"] = popped;
        await supabase.from("bot_memory").upsert({ bot_id: ctx.botId, key: listName, value: JSON.stringify(items) }, { onConflict: "bot_id,key" });
        break;
      }
      case "action_api_call": {
        // Disabled for security in client-side — requires server-side proxy
        await addLog(ctx.botId, "warn", "API calls require server-side execution");
        ctx.variables["response_body"] = "";
        ctx.variables["status_code"] = "0";
        nextPort = "error";
        break;
      }
      case "action_embed_builder": {
        // Build embed and send as formatted message
        const title = interpolate((node.data.title as string) || "", ctx);
        const desc = interpolate((node.data.description as string) || "", ctx);
        const footer = interpolate((node.data.footer as string) || "", ctx);
        const f1n = interpolate((node.data.field_1_name as string) || "", ctx);
        const f1v = interpolate((node.data.field_1_value as string) || "", ctx);
        const f2n = interpolate((node.data.field_2_name as string) || "", ctx);
        const f2v = interpolate((node.data.field_2_value as string) || "", ctx);
        let content = "";
        if (title) content += `**${title}**\n`;
        if (desc) content += `${desc}\n`;
        if (f1n && f1v) content += `\n**${f1n}:** ${f1v}`;
        if (f2n && f2v) content += `\n**${f2n}:** ${f2v}`;
        if (footer) content += `\n\n_${footer}_`;
        if (ctx.channelId && content) {
          const { data: bot } = await supabase.from("bots").select("user_id").eq("id", ctx.botId).single();
          if (bot) {
            await supabase.from("messages").insert({ channel_id: ctx.channelId, user_id: bot.user_id, content });
          }
        }
        break;
      }
      case "action_poll": {
        const question = interpolate((node.data.question as string) || "", ctx);
        const options = ((node.data.options as string) || "").split("\n").filter(Boolean);
        const content = `📊 **${question}**\n${options.map((o, i) => `${["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"][i] || `${i+1}.`} ${o}`).join("\n")}`;
        if (ctx.channelId && question) {
          const { data: bot } = await supabase.from("bots").select("user_id").eq("id", ctx.botId).single();
          if (bot) {
            const { data: msg } = await supabase.from("messages").insert({ channel_id: ctx.channelId, user_id: bot.user_id, content }).select("id").single();
            if (msg) ctx.variables["poll_id"] = msg.id;
          }
        }
        break;
      }

      default:
        await addLog(ctx.botId, "warn", `Unknown node type: ${node.type}`);
    }

    // Follow connections from this node's output port
    const nextNodes = getConnectedNodes(node.id, nextPort, workflow.connections, workflow.nodes);
    for (const next of nextNodes) {
      await executeNode(next, workflow, ctx, depth + 1);
    }
  } catch (err) {
    await addLog(ctx.botId, "error", `Error in ${node.type}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Trigger a workflow from an event
export async function triggerWorkflow(
  workflow: BotWorkflow,
  triggerType: NodeType,
  ctx: Omit<Context, "workflowId" | "variables">
) {
  if (!workflow.is_active) return;

  const triggerNodes = workflow.nodes.filter((n) => n.type === triggerType);
  if (triggerNodes.length === 0) return;

  const fullCtx: Context = {
    ...ctx,
    workflowId: workflow.id,
    variables: { ...workflow.variables },
  };

  for (const triggerNode of triggerNodes) {
    // Check trigger-specific conditions
    if (triggerType === "trigger_on_keyword") {
      const keywords = ((triggerNode.data.keywords as string) || "").split(",").map((k) => k.trim().toLowerCase());
      if (keywords.length > 0 && !keywords.some((k) => (ctx.messageContent || "").toLowerCase().includes(k))) {
        continue;
      }
    }
    if (triggerType === "trigger_on_command") {
      const prefix = (triggerNode.data.prefix as string) || "!";
      const command = (triggerNode.data.command as string) || "";
      if (command && !(ctx.messageContent || "").startsWith(`${prefix}${command}`)) {
        continue;
      }
    }

    await addLog(ctx.botId, "info", `Trigger fired: ${triggerType}`);

    const nextNodes = getConnectedNodes(triggerNode.id, "out", workflow.connections, workflow.nodes);
    for (const next of nextNodes) {
      await executeNode(next, workflow, fullCtx, 0);
    }
  }
}

// Listen for events and trigger active bot workflows
export async function processMessageEvent(
  botId: string,
  serverId: string,
  channelId: string,
  userId: string,
  messageId: string,
  messageContent: string
) {
  const supabase = createClient();
  const { data: bot } = await supabase.from("bots").select("*").eq("id", botId).single();
  if (!bot || bot.status !== "online") return;

  const { data: workflows } = await supabase
    .from("bot_workflows")
    .select("*")
    .eq("bot_id", botId)
    .eq("is_active", true);

  if (!workflows) return;

  const ctx = { botId, serverId, channelId, userId, messageId, messageContent };

  for (const wf of workflows as BotWorkflow[]) {
    await triggerWorkflow(wf, "trigger_on_message", ctx);

    // Check if bot was mentioned
    if (messageContent.includes(`@${bot.name}`)) {
      await triggerWorkflow(wf, "trigger_on_mention", ctx);
    }

    // Check keyword triggers
    await triggerWorkflow(wf, "trigger_on_keyword", ctx);

    // Check command triggers
    await triggerWorkflow(wf, "trigger_on_command", ctx);
  }
}

// Process DM events — find bots in the DM channel and trigger their workflows
export async function processDmEvent(
  dmChannelId: string,
  senderId: string,
  messageId: string,
  messageContent: string
) {
  const supabase = createClient();

  // Get DM channel to find participants
  const { data: dmChannel } = await supabase
    .from("dm_channels")
    .select("user1_id, user2_id")
    .eq("id", dmChannelId)
    .single();

  if (!dmChannel) return;

  // Determine which participant (if any) is a bot
  const otherUserId = dmChannel.user1_id === senderId ? dmChannel.user2_id : dmChannel.user1_id;

  // Find bot by user_id
  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("user_id", otherUserId)
    .eq("status", "online")
    .single();

  if (!bot) return;

  const { data: workflows } = await supabase
    .from("bot_workflows")
    .select("*")
    .eq("bot_id", bot.id)
    .eq("is_active", true);

  if (!workflows) return;

  const ctx = {
    botId: bot.id,
    channelId: dmChannelId,
    userId: senderId,
    messageId,
    messageContent,
  };

  for (const wf of workflows as BotWorkflow[]) {
    await triggerWorkflow(wf, "trigger_on_dm", ctx);

    // Also check keyword and command triggers in DMs
    await triggerWorkflow(wf, "trigger_on_keyword", ctx);
    await triggerWorkflow(wf, "trigger_on_command", ctx);
  }
}
