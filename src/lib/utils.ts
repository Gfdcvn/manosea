import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}

export function getStandingInfo(level: number) {
  const standings = [
    { level: 0, title: "Perfect", label: "Perfect", color: "#43b581", textClass: "text-standing-perfect", bg: "bg-standing-perfect", description: "No issues. Excellent community member." },
    { level: 1, title: "Good", label: "Good", color: "#faa61a", textClass: "text-standing-good", bg: "bg-standing-good", description: "Minor infractions. Mostly good." },
    { level: 2, title: "In Danger", label: "In Danger", color: "#f04747", textClass: "text-standing-danger", bg: "bg-standing-danger", description: "Multiple infractions. One more could escalate." },
    { level: 3, title: "Critical", label: "Critical", color: "#a84300", textClass: "text-standing-critical", bg: "bg-standing-critical", description: "Severe violations. Suspension imminent." },
    { level: 4, title: "Suspended", label: "Suspended", color: "#72767d", textClass: "text-standing-suspended", bg: "bg-standing-suspended", description: "Account suspended." },
  ];
  return standings[Math.min(level, 4)] || standings[0];
}

export function getStatusColor(status: string) {
  switch (status) {
    case "online": return "bg-discord-green";
    case "idle": return "bg-discord-yellow";
    case "dnd": return "bg-discord-red";
    case "invisible":
    case "offline":
    default: return "bg-gray-500";
  }
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function generateInviteCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const ALLOWED_FILE_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "application/zip",
  "text/plain", "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
