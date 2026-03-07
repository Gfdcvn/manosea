import { NodeType } from "@/types";
import {
  MessageSquare, Mail, AtSign, UserPlus, UserMinus, SmilePlus, Terminal, Search, Clock,
  PlusCircle, Shield, Play, Send, Reply, Trash2, Pin, Hash, Pencil,
  ShieldPlus, ShieldMinus, UserX, Ban, VolumeX, Tag, FileText, Timer,
  Database, Shuffle, GitBranch, ScrollText, Globe, Braces, Calculator,
  Type, Repeat, MousePointerClick, Tally3,
} from "lucide-react";

export interface NodeDef {
  type: NodeType;
  label: string;
  category: "trigger" | "action" | "logic" | "data";
  color: string;       // tailwind bg class for the node header
  borderColor: string;
  icon: React.ElementType;
  inputs: string[];     // port names
  outputs: string[];
  fields: FieldDef[];   // config fields for this node
}

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

export const NODE_DEFS: NodeDef[] = [
  // ===== TRIGGERS =====
  { type: "trigger_on_message", label: "On Message", category: "trigger", color: "bg-emerald-600", borderColor: "border-emerald-500", icon: MessageSquare, inputs: [], outputs: ["out"], fields: [{ key: "channel_id", label: "Channel (empty = all)", type: "text", placeholder: "Channel ID" }] },
  { type: "trigger_on_dm", label: "On DM", category: "trigger", color: "bg-emerald-600", borderColor: "border-emerald-500", icon: Mail, inputs: [], outputs: ["out"], fields: [] },
  { type: "trigger_on_mention", label: "On Mention", category: "trigger", color: "bg-emerald-600", borderColor: "border-emerald-500", icon: AtSign, inputs: [], outputs: ["out"], fields: [] },
  { type: "trigger_on_join", label: "On User Join", category: "trigger", color: "bg-emerald-600", borderColor: "border-emerald-500", icon: UserPlus, inputs: [], outputs: ["out"], fields: [] },
  { type: "trigger_on_leave", label: "On User Leave", category: "trigger", color: "bg-emerald-600", borderColor: "border-emerald-500", icon: UserMinus, inputs: [], outputs: ["out"], fields: [] },
  { type: "trigger_on_reaction", label: "On Reaction", category: "trigger", color: "bg-emerald-600", borderColor: "border-emerald-500", icon: SmilePlus, inputs: [], outputs: ["out"], fields: [{ key: "emoji", label: "Emoji filter", type: "text", placeholder: "Leave empty for any" }] },
  { type: "trigger_on_command", label: "On Command", category: "trigger", color: "bg-emerald-600", borderColor: "border-emerald-500", icon: Terminal, inputs: [], outputs: ["out"], fields: [{ key: "command", label: "Command name", type: "text", placeholder: "!help" }, { key: "prefix", label: "Prefix", type: "text", placeholder: "!" }] },
  { type: "trigger_on_keyword", label: "On Keyword", category: "trigger", color: "bg-emerald-600", borderColor: "border-emerald-500", icon: Search, inputs: [], outputs: ["out"], fields: [{ key: "keywords", label: "Keywords (comma sep.)", type: "text", placeholder: "hello, hi, hey" }] },
  { type: "trigger_on_schedule", label: "On Schedule", category: "trigger", color: "bg-emerald-600", borderColor: "border-emerald-500", icon: Clock, inputs: [], outputs: ["out"], fields: [{ key: "interval_min", label: "Interval (minutes)", type: "number", placeholder: "60" }] },
  { type: "trigger_on_channel_create", label: "On Channel Create", category: "trigger", color: "bg-emerald-600", borderColor: "border-emerald-500", icon: PlusCircle, inputs: [], outputs: ["out"], fields: [] },
  { type: "trigger_on_role_change", label: "On Role Change", category: "trigger", color: "bg-emerald-600", borderColor: "border-emerald-500", icon: Shield, inputs: [], outputs: ["out"], fields: [] },
  { type: "trigger_on_bot_start", label: "On Bot Start", category: "trigger", color: "bg-emerald-600", borderColor: "border-emerald-500", icon: Play, inputs: [], outputs: ["out"], fields: [] },

  // ===== ACTIONS (messaging) =====
  { type: "action_send_message", label: "Send Message", category: "action", color: "bg-blue-600", borderColor: "border-blue-500", icon: Send, inputs: ["in"], outputs: ["out"], fields: [{ key: "channel_id", label: "Channel ID", type: "text", placeholder: "Channel ID" }, { key: "content", label: "Message", type: "textarea", placeholder: "Hello {{user}}!" }] },
  { type: "action_send_dm", label: "Send DM", category: "action", color: "bg-blue-600", borderColor: "border-blue-500", icon: Mail, inputs: ["in"], outputs: ["out"], fields: [{ key: "content", label: "Message", type: "textarea", placeholder: "Hello!" }] },
  { type: "action_reply", label: "Reply", category: "action", color: "bg-blue-600", borderColor: "border-blue-500", icon: Reply, inputs: ["in"], outputs: ["out"], fields: [{ key: "content", label: "Reply text", type: "textarea", placeholder: "Thanks!" }] },
  { type: "action_add_reaction", label: "Add Reaction", category: "action", color: "bg-blue-600", borderColor: "border-blue-500", icon: SmilePlus, inputs: ["in"], outputs: ["out"], fields: [{ key: "emoji", label: "Emoji", type: "text", placeholder: "👍" }] },
  { type: "action_delete_message", label: "Delete Message", category: "action", color: "bg-blue-600", borderColor: "border-blue-500", icon: Trash2, inputs: ["in"], outputs: ["out"], fields: [] },
  { type: "action_pin_message", label: "Pin Message", category: "action", color: "bg-blue-600", borderColor: "border-blue-500", icon: Pin, inputs: ["in"], outputs: ["out"], fields: [] },
  { type: "action_send_embed", label: "Send Embed", category: "action", color: "bg-blue-600", borderColor: "border-blue-500", icon: FileText, inputs: ["in"], outputs: ["out"], fields: [{ key: "title", label: "Embed Title", type: "text", placeholder: "Title" }, { key: "description", label: "Embed Description", type: "textarea", placeholder: "Description" }, { key: "color", label: "Color (hex)", type: "text", placeholder: "#5865f2" }] },
  { type: "action_edit_message", label: "Edit Message", category: "action", color: "bg-blue-600", borderColor: "border-blue-500", icon: Pencil, inputs: ["in"], outputs: ["out"], fields: [{ key: "content", label: "New content", type: "textarea", placeholder: "Updated!" }] },
  { type: "action_send_button", label: "Send Button", category: "action", color: "bg-blue-600", borderColor: "border-blue-500", icon: MousePointerClick, inputs: ["in"], outputs: ["out"], fields: [{ key: "label", label: "Button label", type: "text", placeholder: "Click me" }, { key: "content", label: "Message", type: "textarea", placeholder: "Click the button below" }] },

  // ===== ACTIONS (server management) =====
  { type: "action_create_channel", label: "Create Channel", category: "action", color: "bg-indigo-600", borderColor: "border-indigo-500", icon: Hash, inputs: ["in"], outputs: ["out"], fields: [{ key: "name", label: "Channel name", type: "text", placeholder: "new-channel" }] },
  { type: "action_delete_channel", label: "Delete Channel", category: "action", color: "bg-indigo-600", borderColor: "border-indigo-500", icon: Trash2, inputs: ["in"], outputs: ["out"], fields: [{ key: "channel_id", label: "Channel ID", type: "text", placeholder: "Channel to delete" }] },
  { type: "action_rename_channel", label: "Rename Channel", category: "action", color: "bg-indigo-600", borderColor: "border-indigo-500", icon: Pencil, inputs: ["in"], outputs: ["out"], fields: [{ key: "channel_id", label: "Channel ID", type: "text" }, { key: "name", label: "New name", type: "text", placeholder: "renamed-channel" }] },
  { type: "action_assign_role", label: "Assign Role", category: "action", color: "bg-indigo-600", borderColor: "border-indigo-500", icon: ShieldPlus, inputs: ["in"], outputs: ["out"], fields: [{ key: "role_id", label: "Role ID", type: "text" }] },
  { type: "action_remove_role", label: "Remove Role", category: "action", color: "bg-indigo-600", borderColor: "border-indigo-500", icon: ShieldMinus, inputs: ["in"], outputs: ["out"], fields: [{ key: "role_id", label: "Role ID", type: "text" }] },
  { type: "action_kick_user", label: "Kick User", category: "action", color: "bg-orange-600", borderColor: "border-orange-500", icon: UserX, inputs: ["in"], outputs: ["out"], fields: [{ key: "reason", label: "Reason", type: "text", placeholder: "Rule violation" }] },
  { type: "action_ban_user", label: "Ban User", category: "action", color: "bg-red-600", borderColor: "border-red-500", icon: Ban, inputs: ["in"], outputs: ["out"], fields: [{ key: "reason", label: "Reason", type: "text", placeholder: "Banned" }] },
  { type: "action_mute_user", label: "Mute User", category: "action", color: "bg-orange-600", borderColor: "border-orange-500", icon: VolumeX, inputs: ["in"], outputs: ["out"], fields: [{ key: "duration_min", label: "Duration (min)", type: "number", placeholder: "10" }] },
  { type: "action_set_nickname", label: "Set Nickname", category: "action", color: "bg-indigo-600", borderColor: "border-indigo-500", icon: Tag, inputs: ["in"], outputs: ["out"], fields: [{ key: "nickname", label: "Nickname", type: "text", placeholder: "Cool Name" }] },

  // ===== LOGIC & DATA =====
  { type: "action_add_delay", label: "Delay", category: "logic", color: "bg-amber-600", borderColor: "border-amber-500", icon: Timer, inputs: ["in"], outputs: ["out"], fields: [{ key: "seconds", label: "Seconds", type: "number", placeholder: "5" }] },
  { type: "action_condition", label: "If / Else", category: "logic", color: "bg-amber-600", borderColor: "border-amber-500", icon: GitBranch, inputs: ["in"], outputs: ["true", "false"], fields: [{ key: "variable", label: "Variable", type: "text", placeholder: "{{count}}" }, { key: "operator", label: "Operator", type: "select", options: [{ value: "==", label: "equals" }, { value: "!=", label: "not equals" }, { value: ">", label: "greater than" }, { value: "<", label: "less than" }, { value: "contains", label: "contains" }] }, { key: "value", label: "Value", type: "text", placeholder: "10" }] },
  { type: "action_random_choice", label: "Random Choice", category: "logic", color: "bg-amber-600", borderColor: "border-amber-500", icon: Shuffle, inputs: ["in"], outputs: ["out"], fields: [{ key: "choices", label: "Choices (one per line)", type: "textarea", placeholder: "Hello!\nHi there!\nHey!" }] },
  { type: "action_loop", label: "Loop", category: "logic", color: "bg-amber-600", borderColor: "border-amber-500", icon: Repeat, inputs: ["in"], outputs: ["body", "done"], fields: [{ key: "count", label: "Iterations", type: "number", placeholder: "3" }] },

  { type: "action_set_variable", label: "Set Variable", category: "data", color: "bg-violet-600", borderColor: "border-violet-500", icon: Database, inputs: ["in"], outputs: ["out"], fields: [{ key: "var_name", label: "Variable name", type: "text", placeholder: "counter" }, { key: "var_value", label: "Value", type: "text", placeholder: "0" }] },
  { type: "action_get_variable", label: "Get Variable", category: "data", color: "bg-violet-600", borderColor: "border-violet-500", icon: Database, inputs: ["in"], outputs: ["out"], fields: [{ key: "var_name", label: "Variable name", type: "text", placeholder: "counter" }] },
  { type: "action_log", label: "Log", category: "data", color: "bg-violet-600", borderColor: "border-violet-500", icon: ScrollText, inputs: ["in"], outputs: ["out"], fields: [{ key: "message", label: "Log message", type: "text", placeholder: "Debug: {{value}}" }] },
  { type: "action_http_request", label: "HTTP Request", category: "data", color: "bg-violet-600", borderColor: "border-violet-500", icon: Globe, inputs: ["in"], outputs: ["out"], fields: [{ key: "method", label: "Method", type: "select", options: [{ value: "GET", label: "GET" }, { value: "POST", label: "POST" }] }, { key: "url", label: "URL", type: "text", placeholder: "https://api.example.com/data" }] },
  { type: "action_json_parse", label: "Parse JSON", category: "data", color: "bg-violet-600", borderColor: "border-violet-500", icon: Braces, inputs: ["in"], outputs: ["out"], fields: [{ key: "path", label: "JSON path", type: "text", placeholder: "data.items[0].name" }] },
  { type: "action_math", label: "Math", category: "data", color: "bg-violet-600", borderColor: "border-violet-500", icon: Calculator, inputs: ["in"], outputs: ["out"], fields: [{ key: "expression", label: "Expression", type: "text", placeholder: "{{a}} + {{b}}" }] },
  { type: "action_string_format", label: "Format String", category: "data", color: "bg-violet-600", borderColor: "border-violet-500", icon: Type, inputs: ["in"], outputs: ["out"], fields: [{ key: "template", label: "Template", type: "text", placeholder: "Hello {{user}}, welcome!" }] },
  { type: "action_counter", label: "Counter", category: "data", color: "bg-violet-600", borderColor: "border-violet-500", icon: Tally3, inputs: ["in"], outputs: ["out"], fields: [{ key: "var_name", label: "Counter name", type: "text", placeholder: "msg_count" }, { key: "operation", label: "Operation", type: "select", options: [{ value: "increment", label: "Increment" }, { value: "decrement", label: "Decrement" }, { value: "reset", label: "Reset" }] }] },
];

export const NODE_DEF_MAP = Object.fromEntries(NODE_DEFS.map((d) => [d.type, d])) as Record<NodeType, NodeDef>;

export const NODE_CATEGORIES = [
  { key: "trigger", label: "Triggers", color: "text-emerald-400" },
  { key: "action", label: "Actions", color: "text-blue-400" },
  { key: "logic", label: "Logic", color: "text-amber-400" },
  { key: "data", label: "Data", color: "text-violet-400" },
] as const;
