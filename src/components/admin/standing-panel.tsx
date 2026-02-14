"use client";

import { useEffect } from "react";
import { useAdminStore } from "@/stores/admin-store";
import { getStandingInfo, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StandingPanelProps {
  userId: string;
  standing: number;
}

export function StandingPanel({ userId, standing }: StandingPanelProps) {
  const { punishments, fetchUserPunishments } = useAdminStore();
  const standingInfo = getStandingInfo(standing);

  useEffect(() => {
    fetchUserPunishments(userId);
  }, [userId, fetchUserPunishments]);

  const levels = [0, 1, 2, 3, 4];

  return (
    <div className="space-y-6">
      {/* Standing Timeline */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Standing Level</h3>
        <div className="flex items-center justify-between px-4">
          {levels.map((level) => {
            const info = getStandingInfo(level);
            const isActive = level <= standing;
            const isCurrent = level === standing;
            return (
              <div key={level} className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full transition-all",
                    isCurrent && "ring-2 ring-offset-2 ring-offset-discord-dark scale-125",
                    isActive ? "opacity-100" : "opacity-30"
                  )}
                  style={{
                    backgroundColor: info.color,
                    boxShadow: isCurrent ? `0 0 0 2px var(--discord-dark, #2f3136), 0 0 0 4px ${info.color}` : undefined,
                  }}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isCurrent ? "text-white" : "text-gray-500"
                  )}
                >
                  {info.label}
                </span>
              </div>
            );
          })}
        </div>
        {/* Connecting line */}
        <div className="relative h-1 mx-6 mt-[-28px] mb-6">
          <div className="absolute inset-0 bg-gray-700 rounded" />
          <div
            className="absolute inset-y-0 left-0 rounded transition-all"
            style={{
              width: `${(standing / 4) * 100}%`,
              backgroundColor: standingInfo.color,
            }}
          />
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-discord-darker rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: standingInfo.color }}
          />
          <span className="text-sm font-semibold text-white">{standingInfo.label}</span>
          <span className="text-xs text-gray-500">Level {standing}/4</span>
        </div>
        <p className="text-xs text-gray-400">{standingInfo.description}</p>
      </div>

      {/* Punishment History */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Punishment History</h3>
        {punishments.length === 0 ? (
          <p className="text-xs text-gray-500">No punishments on record.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {punishments.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "bg-discord-darker rounded-lg p-3 border-l-2",
                  p.is_active ? "border-red-400" : "border-gray-600"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white uppercase">{p.type}</span>
                  <span className="text-[10px] text-gray-500">
                    {formatDate(p.issued_at)}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{p.reason}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  {p.expires_at && (
                    <span className="text-[10px] text-gray-500">
                      Expires: {formatDate(p.expires_at)}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      p.is_active
                        ? "bg-red-400/10 text-red-400"
                        : "bg-gray-600/20 text-gray-500"
                    )}
                  >
                    {p.is_active ? "Active" : "Expired"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
