"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/stores/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StandingPanel } from "@/components/admin/standing-panel";
import { getStandingInfo } from "@/lib/utils";
import { User, UserBadge } from "@/types";
import { Search, AlertTriangle, Eye, Award, X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminUsersPage() {
  const {
    users,
    badges,
    fetchAllUsers,
    fetchAllBadges,
    updateUserRole,
    issuePunishment,
    fetchUserPunishments,
    assignBadgeToUser,
    removeBadgeFromUser,
  } = useAdminStore();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showStandingDialog, setShowStandingDialog] = useState(false);
  const [standingUser, setStandingUser] = useState<User | null>(null);
  const [showPunishDialog, setShowPunishDialog] = useState(false);
  const [punishType, setPunishType] = useState<string>("warn");
  const [punishReason, setPunishReason] = useState("");
  const [punishDuration, setPunishDuration] = useState("");
  const [punishingUserId, setPunishingUserId] = useState<string | null>(null);

  // User detail badge state
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [showAssignBadge, setShowAssignBadge] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState("");

  useEffect(() => {
    fetchAllUsers();
    fetchAllBadges();
  }, [fetchAllUsers, fetchAllBadges]);

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = async (userId: string, role: string) => {
    await updateUserRole(userId, role as "user" | "admin" | "superadmin");
  };

  const handlePunish = async () => {
    if (!punishingUserId || !punishReason) return;

    await issuePunishment({
      user_id: punishingUserId,
      type: punishType as "warn" | "suspend" | "ban",
      reason: punishReason,
      duration_days: punishDuration ? parseInt(punishDuration) : undefined,
    });

    setShowPunishDialog(false);
    setPunishReason("");
    setPunishDuration("");
    setPunishType("warn");
    fetchAllUsers();
  };

  const openPunishDialog = (userId: string) => {
    setPunishingUserId(userId);
    setShowPunishDialog(true);
  };

  const openUserDetail = async (user: User) => {
    setSelectedUser(user);
    await fetchUserBadges(user.id);
  };

  const fetchUserBadges = async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_badges")
      .select("*, badge:badges(*)")
      .eq("user_id", userId);
    setUserBadges((data as UserBadge[]) || []);
  };

  const handleAssignBadge = async () => {
    if (!selectedUser || !selectedBadgeId) return;
    await assignBadgeToUser(selectedUser.id, selectedBadgeId);
    await fetchUserBadges(selectedUser.id);
    setShowAssignBadge(false);
    setSelectedBadgeId("");
    fetchAllUsers();
  };

  const handleRemoveBadge = async (badgeId: string) => {
    if (!selectedUser) return;
    await removeBadgeFromUser(selectedUser.id, badgeId);
    await fetchUserBadges(selectedUser.id);
    fetchAllUsers();
  };

  const availableBadges = badges.filter(
    (b) => !userBadges.some((ub) => ub.badge_id === b.id)
  );

  return (
    <div className="p-8 bg-discord-chat min-h-full">
      <h1 className="text-2xl font-bold text-white mb-6">User Management</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name, username, or email..."
          className="pl-10"
        />
      </div>

      {/* User table */}
      <div className="bg-discord-dark rounded-lg border border-gray-800">
        <div className="grid grid-cols-[1fr_1fr_120px_100px_80px_100px] gap-4 p-4 border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase">
          <span>User</span>
          <span>Email</span>
          <span>Role</span>
          <span>Standing</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        <ScrollArea className="max-h-[600px]">
          {filteredUsers.map((u) => {
            const standing = getStandingInfo(u.standing_level || 0);
            return (
              <div
                key={u.id}
                className="grid grid-cols-[1fr_1fr_120px_100px_80px_100px] gap-4 p-4 border-b border-gray-800/50 items-center hover:bg-discord-hover/50 cursor-pointer"
                onClick={() => openUserDetail(u)}
              >
                {/* User */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {u.display_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{u.display_name}</p>
                    <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                  </div>
                </div>

                {/* Email */}
                <span className="text-sm text-gray-400 truncate">{u.email}</span>

                {/* Role */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={u.role || "user"}
                    onValueChange={(v) => handleRoleChange(u.id, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Superadmin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Standing */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setStandingUser(u);
                    setShowStandingDialog(true);
                    fetchUserPunishments(u.id);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: standing.color }}
                  />
                  <span className="text-xs" style={{ color: standing.color }}>
                    {standing.label}
                  </span>
                </button>

                {/* Status */}
                <span className="text-xs text-gray-400 capitalize">{u.status}</span>

                {/* Actions */}
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openUserDetail(u)}
                    className="p-1.5 rounded hover:bg-discord-hover text-gray-400 hover:text-discord-brand"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openPunishDialog(u.id)}
                    className="p-1.5 rounded hover:bg-discord-hover text-gray-400 hover:text-yellow-400"
                    title="Issue Punishment"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>User Details</DialogTitle>
              </DialogHeader>

              {/* Profile Header */}
              <div className="flex items-start gap-4 p-4 bg-discord-darker rounded-lg">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="text-xl">
                    {selectedUser.display_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white">{selectedUser.display_name}</h3>
                  <p className="text-sm text-gray-400">@{selectedUser.username}</p>
                  <p className="text-xs text-gray-500 mt-1">{selectedUser.email}</p>
                  {selectedUser.about_me && (
                    <p className="text-sm text-gray-300 mt-2">{selectedUser.about_me}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs px-2 py-1 rounded ${
                    selectedUser.role === "superadmin" ? "bg-red-500/20 text-red-400" :
                    selectedUser.role === "admin" ? "bg-blue-500/20 text-blue-400" :
                    "bg-gray-500/20 text-gray-400"
                  }`}>
                    {selectedUser.role}
                  </span>
                  <p className="text-xs text-gray-500 mt-2 capitalize">{selectedUser.status}</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-discord-darker rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Standing</p>
                  <p className="text-sm font-medium mt-1" style={{ color: getStandingInfo(selectedUser.standing_level || 0).color }}>
                    {getStandingInfo(selectedUser.standing_level || 0).label}
                  </p>
                </div>
                <div className="bg-discord-darker rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Joined</p>
                  <p className="text-sm text-gray-300 mt-1">
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-discord-darker rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Flags</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {selectedUser.is_bot && <span className="text-xs px-1.5 py-0.5 bg-discord-brand/20 text-discord-brand rounded">Bot</span>}
                    {selectedUser.is_banned && <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Banned</span>}
                    {selectedUser.is_suspended && <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Suspended</span>}
                    {!selectedUser.is_bot && !selectedUser.is_banned && !selectedUser.is_suspended && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">Active</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedUser.is_suspended && selectedUser.suspension_reason && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-4">
                  <p className="text-xs font-semibold text-yellow-400 uppercase">Suspension Reason</p>
                  <p className="text-sm text-yellow-300 mt-1">{selectedUser.suspension_reason}</p>
                  {selectedUser.suspension_end && (
                    <p className="text-xs text-yellow-500 mt-1">
                      Ends: {new Date(selectedUser.suspension_end).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* User Badges Section */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-discord-brand" />
                    <h4 className="text-sm font-semibold text-white">Badges ({userBadges.length})</h4>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setShowAssignBadge(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Assign Badge
                  </Button>
                </div>

                {userBadges.length === 0 ? (
                  <p className="text-xs text-gray-500">No badges assigned.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {userBadges.map((ub) => (
                      <div
                        key={ub.id}
                        className="flex items-center gap-2 bg-discord-darker rounded-full px-3 py-1.5 border border-gray-700 group"
                      >
                        <span className="text-sm">{ub.badge?.icon}</span>
                        <span className="text-xs text-gray-300">{ub.badge?.name}</span>
                        <button
                          onClick={() => handleRemoveBadge(ub.badge_id)}
                          className="p-0.5 rounded-full hover:bg-red-500/20 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove badge"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const u = selectedUser;
                    setSelectedUser(null);
                    setStandingUser(u);
                    setShowStandingDialog(true);
                    fetchUserPunishments(u.id);
                  }}
                >
                  View Standing
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-yellow-400 hover:text-yellow-300"
                  onClick={() => {
                    const uid = selectedUser.id;
                    setSelectedUser(null);
                    openPunishDialog(uid);
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Issue Punishment
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Badge Dialog */}
      <Dialog open={showAssignBadge} onOpenChange={setShowAssignBadge}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Badge to {selectedUser?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {availableBadges.length === 0 ? (
              <p className="text-sm text-gray-400">No available badges to assign.</p>
            ) : (
              <>
                <div>
                  <Label className="text-xs font-bold text-gray-300 uppercase">Select Badge</Label>
                  <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a badge..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBadges.map((badge) => (
                        <SelectItem key={badge.id} value={badge.id}>
                          <span className="flex items-center gap-2">
                            <span>{badge.icon}</span>
                            <span>{badge.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setShowAssignBadge(false)}>Cancel</Button>
                  <Button onClick={handleAssignBadge} disabled={!selectedBadgeId}>Assign Badge</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Standing Detail Panel */}
      {standingUser && (
        <Dialog open={showStandingDialog} onOpenChange={(open) => { if (!open) { setShowStandingDialog(false); setStandingUser(null); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Standing — {standingUser.display_name}</DialogTitle>
            </DialogHeader>
            <StandingPanel userId={standingUser.id} standing={standingUser.standing_level || 0} />
          </DialogContent>
        </Dialog>
      )}

      {/* Punish Dialog */}
      <Dialog open={showPunishDialog} onOpenChange={setShowPunishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Punishment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase">Type</Label>
              <Select value={punishType} onValueChange={setPunishType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="mute">Mute</SelectItem>
                  <SelectItem value="kick">Kick</SelectItem>
                  <SelectItem value="ban">Ban</SelectItem>
                  <SelectItem value="suspend">Suspend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase">Reason</Label>
              <Textarea
                value={punishReason}
                onChange={(e) => setPunishReason(e.target.value)}
                placeholder="Reason for punishment"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase">
                Duration (days, leave empty for permanent)
              </Label>
              <Input
                type="number"
                value={punishDuration}
                onChange={(e) => setPunishDuration(e.target.value)}
                placeholder="24"
                min="1"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowPunishDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handlePunish} disabled={!punishReason}>
                Issue Punishment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
