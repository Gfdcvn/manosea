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
import { Plus, Compass, MessageCircle, BadgeCheck, AlertTriangle, Bell, BellOff, LogOut, FolderPlus, ChevronDown, ChevronRight, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { CreateServerModal } from "@/components/modals/create-server-modal";
import { ExploreServersModal } from "@/components/modals/explore-servers-modal";
import { useNotificationStore } from "@/stores/notification-store";
import { useMessageStore } from "@/stores/message-store";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Server } from "@/types";

// ====== Personal Server Categories (local storage) ======
interface ServerCategory {
  id: string;
  name: string;
  color: string | null;
  gradientStart: string | null;
  gradientEnd: string | null;
  collapsed: boolean;
}

interface ServerOrganization {
  categories: ServerCategory[];
  // Maps serverId to categoryId (null = uncategorized)
  serverCategoryMap: Record<string, string>;
  // Order of servers within each category and uncategorized
  serverOrder: string[];
}

function getOrgKey(userId: string) {
  return `ricord-server-org-${userId}`;
}

function loadOrg(userId: string): ServerOrganization {
  if (typeof window === "undefined") return { categories: [], serverCategoryMap: {}, serverOrder: [] };
  try {
    const raw = localStorage.getItem(getOrgKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { categories: [], serverCategoryMap: {}, serverOrder: [] };
}

function saveOrg(userId: string, org: ServerOrganization) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getOrgKey(userId), JSON.stringify(org));
}

export function ServerSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const servers = useServerStore((s) => s.servers);
  const fetchServers = useServerStore((s) => s.fetchServers);
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const serverMentions = useNotificationStore((s) => s.serverMentions);
  const unreadDmChannels = useMessageStore((s) => s.unreadDmChannels);
  const { toggleMuteServer, isServerMuted } = useNotificationStore();
  const { user, updateSettings } = useAuthStore();

  const isDmActive = pathname?.startsWith("/channels/me");
  const hasUnreadDms = unreadDmChannels.size > 0;
  const dmMentionCount = useNotificationStore((s) => s.getServerMentionCount("dm"));

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    server: Server;
  } | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<Server | null>(null);

  // Category dialog
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServerCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catColorMode, setCatColorMode] = useState<"solid" | "gradient">("solid");
  const [catColor, setCatColor] = useState("#5865f2");
  const [catGradStart, setCatGradStart] = useState("#5865f2");
  const [catGradEnd, setCatGradEnd] = useState("#eb459e");

  // Organization state
  const [org, setOrg] = useState<ServerOrganization>({ categories: [], serverCategoryMap: {}, serverOrder: [] });

  // Drag state
  const [dragServerId, setDragServerId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Load organization on user change
  useEffect(() => {
    if (user) {
      setOrg(loadOrg(user.id));
    }
  }, [user]);

  const updateOrg = useCallback((newOrg: ServerOrganization) => {
    if (!user) return;
    setOrg(newOrg);
    saveOrg(user.id, newOrg);
  }, [user]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, server: Server) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, server });
  };

  const handleLeaveServer = async () => {
    if (!leaveTarget || !user) return;
    const supabase = createClient();
    await supabase.from("server_members").delete().eq("server_id", leaveTarget.id).eq("user_id", user.id);
    await fetchServers();
    setShowLeaveDialog(false);
    setLeaveTarget(null);
    if (pathname?.includes(leaveTarget.id)) {
      router.push("/channels/me");
    }
  };

  const handleToggleMute = async (server: Server) => {
    toggleMuteServer(server.id);
    const mutedServers = useNotificationStore.getState().mutedServers;
    await updateSettings({ muted_servers: Array.from(mutedServers) });
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCatName("");
    setCatColorMode("solid");
    setCatColor("#5865f2");
    setCatGradStart("#5865f2");
    setCatGradEnd("#eb459e");
    setShowCategoryDialog(true);
    setContextMenu(null);
  };

  const handleSaveCategory = () => {
    const id = editingCategory?.id || crypto.randomUUID();
    const cat: ServerCategory = {
      id,
      name: catName.trim() || "Category",
      color: catColorMode === "solid" ? catColor : null,
      gradientStart: catColorMode === "gradient" ? catGradStart : null,
      gradientEnd: catColorMode === "gradient" ? catGradEnd : null,
      collapsed: editingCategory?.collapsed ?? false,
    };
    const cats = editingCategory
      ? org.categories.map((c) => (c.id === id ? cat : c))
      : [...org.categories, cat];
    updateOrg({ ...org, categories: cats });
    setShowCategoryDialog(false);
  };

  const handleDeleteCategory = (catId: string) => {
    const newMap = { ...org.serverCategoryMap };
    Object.keys(newMap).forEach((sid) => {
      if (newMap[sid] === catId) delete newMap[sid];
    });
    updateOrg({
      ...org,
      categories: org.categories.filter((c) => c.id !== catId),
      serverCategoryMap: newMap,
    });
  };

  const toggleCategoryCollapse = (catId: string) => {
    updateOrg({
      ...org,
      categories: org.categories.map((c) =>
        c.id === catId ? { ...c, collapsed: !c.collapsed } : c
      ),
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, serverId: string) => {
    setDragServerId(serverId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", serverId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTarget(targetId);
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDropOnCategory = (e: React.DragEvent, catId: string | null) => {
    e.preventDefault();
    if (!dragServerId) return;
    const newMap = { ...org.serverCategoryMap };
    if (catId) {
      newMap[dragServerId] = catId;
    } else {
      delete newMap[dragServerId];
    }
    updateOrg({ ...org, serverCategoryMap: newMap });
    setDragServerId(null);
    setDragOverTarget(null);
  };

  const handleDropOnServer = (e: React.DragEvent, targetServerId: string) => {
    e.preventDefault();
    if (!dragServerId || dragServerId === targetServerId) return;

    // Re-order servers: put dragged server before/after target
    const allServerIds = getOrderedServerIds();
    const fromIdx = allServerIds.indexOf(dragServerId);
    const toIdx = allServerIds.indexOf(targetServerId);
    if (fromIdx < 0 || toIdx < 0) return;

    const newOrder = [...allServerIds];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragServerId);

    // Also move to the same category as the target
    const targetCat = org.serverCategoryMap[targetServerId];
    const newMap = { ...org.serverCategoryMap };
    if (targetCat) {
      newMap[dragServerId] = targetCat;
    } else {
      delete newMap[dragServerId];
    }

    updateOrg({ ...org, serverOrder: newOrder, serverCategoryMap: newMap });
    setDragServerId(null);
    setDragOverTarget(null);
  };

  // Get servers in custom order
  const getOrderedServerIds = useCallback((): string[] => {
    const serverIds = servers.map((s) => s.id);
    if (org.serverOrder.length === 0) return serverIds;
    const ordered: string[] = [];
    // Add servers in saved order that still exist
    for (const id of org.serverOrder) {
      if (serverIds.includes(id)) ordered.push(id);
    }
    // Add any new servers not in order yet
    for (const id of serverIds) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  }, [servers, org.serverOrder]);

  // Group servers by category
  const getGroupedServers = useCallback(() => {
    const orderedIds = getOrderedServerIds();
    const serverMap = new Map(servers.map((s) => [s.id, s]));
    const catServers: Record<string, Server[]> = {};
    const uncategorized: Server[] = [];

    // Initialize category buckets
    for (const cat of org.categories) {
      catServers[cat.id] = [];
    }

    for (const sid of orderedIds) {
      const server = serverMap.get(sid);
      if (!server) continue;
      const catId = org.serverCategoryMap[sid];
      if (catId && catServers[catId]) {
        catServers[catId].push(server);
      } else {
        uncategorized.push(server);
      }
    }

    return { catServers, uncategorized };
  }, [servers, org, getOrderedServerIds]);

  const renderServerIcon = (server: Server) => {
    const isActive = pathname?.includes(server.id);
    const hasMention = serverMentions[server.id] && serverMentions[server.id].size > 0;
    const mentionCount = hasMention ? serverMentions[server.id].size : 0;

    return (
      <Tooltip key={server.id}>
        <TooltipTrigger asChild>
          <button
            draggable
            onDragStart={(e) => handleDragStart(e, server.id)}
            onDragOver={(e) => handleDragOver(e, server.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDropOnServer(e, server.id)}
            onClick={() => router.push(`/channels/${server.id}`)}
            onContextMenu={(e) => handleContextMenu(e, server)}
            className={cn(
              "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all duration-200 hover:rounded-[16px] relative group",
              isActive
                ? "bg-discord-brand rounded-[16px] text-white"
                : "bg-discord-channel text-gray-300 hover:bg-discord-brand hover:text-white",
              dragOverTarget === server.id && "ring-2 ring-discord-brand ring-offset-2 ring-offset-discord-darker"
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
            {/* Mention badge */}
            {hasMention && !isActive && (
              <div className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-discord-darker">
                {mentionCount}
              </div>
            )}
            {/* Verified badge */}
            {server.is_verified && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-discord-brand rounded-full flex items-center justify-center border-2 border-discord-darker">
                <BadgeCheck className="w-3 h-3 text-white" />
              </div>
            )}
            {/* Suspended indicator */}
            {server.is_suspended && !server.is_verified && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-discord-darker">
                <AlertTriangle className="w-3 h-3 text-white" />
              </div>
            )}
            {server.is_suspended && server.is_verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-discord-darker">
                <AlertTriangle className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <span>{server.name}</span>
        </TooltipContent>
      </Tooltip>
    );
  };

  const { catServers, uncategorized } = getGroupedServers();

  return (
    <>
      <div className="flex flex-col items-center w-[72px] bg-discord-darker py-3 gap-2 shrink-0">
        {/* DMs Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => router.push("/channels/me")}
              className={cn(
                "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all duration-200 hover:rounded-[16px] relative",
                isDmActive
                  ? "bg-discord-brand rounded-[16px] text-white"
                  : "bg-discord-channel text-gray-300 hover:bg-discord-brand hover:text-white"
              )}
            >
              <MessageCircle className="w-6 h-6" />
              {(hasUnreadDms || dmMentionCount > 0) && !isDmActive && (
                <div className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-discord-darker">
                  {dmMentionCount > 0 ? dmMentionCount : unreadDmChannels.size}
                </div>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Direct Messages</TooltipContent>
        </Tooltip>

        <Separator className="w-8 mx-auto" />

        {/* Server List with Categories */}
        <ScrollArea className="flex-1 w-full">
          <div className="flex flex-col items-center gap-2 px-3">
            {/* Categorized servers */}
            {org.categories.map((cat) => {
              const serversInCat = catServers[cat.id] || [];
              const catStyle = cat.gradientStart && cat.gradientEnd
                ? { background: `linear-gradient(90deg, ${cat.gradientStart}, ${cat.gradientEnd})`, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" as const }
                : cat.color
                ? { color: cat.color }
                : {};

              return (
                <div
                  key={cat.id}
                  className="w-full"
                  onDragOver={(e) => handleDragOver(e, `cat-${cat.id}`)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropOnCategory(e, cat.id)}
                >
                  <button
                    onClick={() => toggleCategoryCollapse(cat.id)}
                    className={cn(
                      "w-full flex items-center justify-center gap-1 mb-1 px-1 py-0.5 rounded transition-colors hover:bg-discord-hover/50",
                      dragOverTarget === `cat-${cat.id}` && "bg-discord-brand/20"
                    )}
                  >
                    {cat.collapsed ? (
                      <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
                    )}
                    <span className="text-[9px] font-bold uppercase truncate" style={catStyle}>
                      {cat.name}
                    </span>
                  </button>
                  {!cat.collapsed && (
                    <div className="flex flex-col items-center gap-2">
                      {serversInCat.map(renderServerIcon)}
                    </div>
                  )}
                  {!cat.collapsed && serversInCat.length === 0 && (
                    <div className="flex items-center justify-center h-8 text-[10px] text-gray-600">
                      Drop here
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized servers */}
            {org.categories.length > 0 && uncategorized.length > 0 && (
              <div
                className={cn("w-full", dragOverTarget === "uncategorized" && "bg-discord-brand/10 rounded")}
                onDragOver={(e) => handleDragOver(e, "uncategorized")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropOnCategory(e, null)}
              />
            )}

            {uncategorized.map(renderServerIcon)}
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
            <button
              onClick={() => setShowExplore(true)}
              className="w-12 h-12 rounded-[24px] flex items-center justify-center bg-discord-channel text-discord-green hover:bg-discord-green hover:text-white hover:rounded-[16px] transition-all duration-200"
            >
              <Compass className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Explore Public Servers</TooltipContent>
        </Tooltip>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[100] min-w-[180px] bg-discord-darker border border-gray-700 rounded-lg p-1 shadow-xl animate-in fade-in-0 zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleToggleMute(contextMenu.server);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm text-gray-200 hover:bg-discord-brand hover:text-white transition-colors"
          >
            {isServerMuted(contextMenu.server.id) ? (
              <>
                <Bell className="w-4 h-4" />
                Unmute Server
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4" />
                Mute Server
              </>
            )}
          </button>
          <button
            onClick={openCreateCategory}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm text-gray-200 hover:bg-discord-brand hover:text-white transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Create Category
          </button>
          {org.categories.length > 0 && (
            <>
              <div className="my-1 h-px bg-gray-700" />
              <p className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase">Move to Category</p>
              {org.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    const newMap = { ...org.serverCategoryMap };
                    if (newMap[contextMenu.server.id] === cat.id) {
                      delete newMap[contextMenu.server.id];
                    } else {
                      newMap[contextMenu.server.id] = cat.id;
                    }
                    updateOrg({ ...org, serverCategoryMap: newMap });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm text-gray-200 hover:bg-discord-brand hover:text-white transition-colors"
                >
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cat.color || cat.gradientStart || "#5865f2" }} />
                  {cat.name}
                  {org.serverCategoryMap[contextMenu.server.id] === cat.id && (
                    <span className="ml-auto text-discord-green text-xs">✓</span>
                  )}
                </button>
              ))}
            </>
          )}
          <div className="my-1 h-px bg-gray-700" />
          {contextMenu.server.owner_id !== user?.id && (
            <button
              onClick={() => {
                setLeaveTarget(contextMenu.server);
                setShowLeaveDialog(true);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Leave Server
            </button>
          )}
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase mb-2">Name</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Gaming"
                maxLength={20}
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase mb-2">Color Style</Label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setCatColorMode("solid")}
                  className={cn("px-3 py-1.5 rounded-md text-sm transition-colors", catColorMode === "solid" ? "bg-discord-brand text-white" : "bg-discord-dark text-gray-400 hover:bg-discord-hover")}
                >
                  Solid
                </button>
                <button
                  onClick={() => setCatColorMode("gradient")}
                  className={cn("px-3 py-1.5 rounded-md text-sm transition-colors", catColorMode === "gradient" ? "bg-discord-brand text-white" : "bg-discord-dark text-gray-400 hover:bg-discord-hover")}
                >
                  Gradient
                </button>
              </div>

              {catColorMode === "solid" && (
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border-2 border-gray-600 cursor-pointer bg-transparent [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch-wrapper]:p-0.5"
                  />
                  <div
                    className="flex-1 h-6 rounded-full"
                    style={{ backgroundColor: catColor }}
                  />
                </div>
              )}

              {catColorMode === "gradient" && (
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={catGradStart}
                    onChange={(e) => setCatGradStart(e.target.value)}
                    className="w-10 h-10 rounded-lg border-2 border-gray-600 cursor-pointer bg-transparent [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch-wrapper]:p-0.5"
                  />
                  <div
                    className="flex-1 h-6 rounded-full"
                    style={{ background: `linear-gradient(90deg, ${catGradStart}, ${catGradEnd})` }}
                  />
                  <input
                    type="color"
                    value={catGradEnd}
                    onChange={(e) => setCatGradEnd(e.target.value)}
                    className="w-10 h-10 rounded-lg border-2 border-gray-600 cursor-pointer bg-transparent [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch-wrapper]:p-0.5"
                  />
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="bg-discord-dark rounded-lg p-3 flex items-center gap-2">
              <span className="text-xs text-gray-500">Preview:</span>
              <span
                className="text-xs font-bold uppercase"
                style={
                  catColorMode === "gradient"
                    ? { background: `linear-gradient(90deg, ${catGradStart}, ${catGradEnd})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
                    : { color: catColor }
                }
              >
                {catName || "Category"}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? "Save" : "Create"}
            </Button>
          </DialogFooter>

          {/* Existing categories list for manage */}
          {org.categories.length > 0 && (
            <div className="border-t border-gray-700 mt-2 pt-3">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Existing Categories</p>
              <div className="space-y-1">
                {org.categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-discord-dark">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cat.color || cat.gradientStart || "#5865f2" }} />
                    <span className="text-xs text-white flex-1">{cat.name}</span>
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setCatName(cat.name);
                        setCatColorMode(cat.gradientStart ? "gradient" : "solid");
                        setCatColor(cat.color || "#5865f2");
                        setCatGradStart(cat.gradientStart || "#5865f2");
                        setCatGradEnd(cat.gradientEnd || "#eb459e");
                      }}
                      className="text-gray-500 hover:text-white text-[10px]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-gray-500 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Leave Server Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Server</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            Are you sure you want to leave <strong className="text-white">{leaveTarget?.name}</strong>? You won&apos;t be able to rejoin unless you are re-invited.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowLeaveDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleLeaveServer}>Leave Server</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateServerModal open={showCreateServer} onClose={() => setShowCreateServer(false)} />
      <ExploreServersModal open={showExplore} onClose={() => setShowExplore(false)} />
    </>
  );
}
