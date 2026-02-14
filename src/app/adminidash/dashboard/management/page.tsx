"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/stores/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/types";
import { Plus, Trash2, Shield, Award } from "lucide-react";

export default function AdminManagementPage() {
  const { badges, fetchAllBadges, createBadge, deleteBadge } = useAdminStore();
  const [showCreateBadge, setShowCreateBadge] = useState(false);
  const [newBadge, setNewBadge] = useState({
    name: "",
    description: "",
    icon: "⭐",
    type: "achievement" as string,
    standing_override: undefined as number | undefined,
  });

  useEffect(() => {
    fetchAllBadges();
  }, [fetchAllBadges]);

  const handleCreateBadge = async () => {
    await createBadge({
      name: newBadge.name,
      description: newBadge.description,
      icon: newBadge.icon,
      type: newBadge.type as "achievement" | "role" | "special" | "custom",
      standing_override: newBadge.standing_override,
    });

    setShowCreateBadge(false);
    setNewBadge({
      name: "",
      description: "",
      icon: "⭐",
      type: "achievement",
      standing_override: undefined,
    });
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (confirm("Are you sure you want to delete this badge?")) {
      await deleteBadge(badgeId);
    }
  };

  const standingBadges = badges.filter((b) => b.standing_override !== null && b.standing_override !== undefined);
  const regularBadges = badges.filter((b) => b.standing_override === null || b.standing_override === undefined);

  return (
    <div className="p-8 bg-discord-chat min-h-full">
      <h1 className="text-2xl font-bold text-white mb-6">Management</h1>

      {/* Badge Registry */}
      <div className="bg-discord-dark rounded-lg border border-gray-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-discord-brand" />
            <h2 className="text-lg font-semibold text-white">Badge Registry</h2>
          </div>
          <Button size="sm" onClick={() => setShowCreateBadge(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Create Badge
          </Button>
        </div>

        {/* Standing Override Badges */}
        {standingBadges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-yellow-400 uppercase mb-3 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Standing Override Badges
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {standingBadges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  onDelete={() => handleDeleteBadge(badge.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Badges */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
            {standingBadges.length > 0 ? "Regular Badges" : "All Badges"}
          </h3>
          {regularBadges.length === 0 ? (
            <p className="text-gray-500 text-sm">No badges created yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {regularBadges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  onDelete={() => handleDeleteBadge(badge.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Badge Dialog */}
      <Dialog open={showCreateBadge} onOpenChange={setShowCreateBadge}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Badge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase">Name</Label>
              <Input
                value={newBadge.name}
                onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                placeholder="Badge name"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase">Description</Label>
              <Textarea
                value={newBadge.description}
                onChange={(e) => setNewBadge({ ...newBadge, description: e.target.value })}
                placeholder="Badge description"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase">Icon (emoji)</Label>
              <Input
                value={newBadge.icon}
                onChange={(e) => setNewBadge({ ...newBadge, icon: e.target.value })}
                placeholder="⭐"
                maxLength={4}
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase">Type</Label>
              <Select
                value={newBadge.type}
                onValueChange={(v) => setNewBadge({ ...newBadge, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="achievement">Achievement</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-300 uppercase">
                Standing Override (optional)
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                If set, users with this badge will have their standing overridden to this level (0-4).
              </p>
              <Select
                value={newBadge.standing_override?.toString() || "none"}
                onValueChange={(v) =>
                  setNewBadge({
                    ...newBadge,
                    standing_override: v === "none" ? undefined : parseInt(v),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Override</SelectItem>
                  <SelectItem value="0">Level 0 — Clean</SelectItem>
                  <SelectItem value="1">Level 1 — Low Risk</SelectItem>
                  <SelectItem value="2">Level 2 — Medium Risk</SelectItem>
                  <SelectItem value="3">Level 3 — High Risk</SelectItem>
                  <SelectItem value="4">Level 4 — Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowCreateBadge(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBadge} disabled={!newBadge.name}>
                Create Badge
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BadgeCard({ badge, onDelete }: { badge: Badge; onDelete: () => void }) {
  return (
    <div className="bg-discord-darker rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{badge.icon}</span>
          <div>
            <h4 className="text-sm font-semibold text-white">{badge.name}</h4>
            <p className="text-xs text-gray-400 capitalize">{badge.type}</p>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {badge.description && (
        <p className="text-xs text-gray-500 mt-2">{badge.description}</p>
      )}
      {badge.standing_override !== null && badge.standing_override !== undefined && (
        <div className="mt-2 px-2 py-1 bg-yellow-400/10 rounded text-xs text-yellow-400">
          Standing Override: Level {badge.standing_override}
        </div>
      )}
    </div>
  );
}
