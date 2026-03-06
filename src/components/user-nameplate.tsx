"use client";

import { NameplateConfig } from "@/types";
import { cn } from "@/lib/utils";

interface UserNameplateProps {
  nameplate: NameplateConfig;
  children: React.ReactNode;
}

const ANIM_CLASS: Record<string, string> = {
  shimmer: "np-anim-shimmer",
  pulse: "np-anim-pulse",
  colorShift: "np-anim-colorShift",
  breathe: "np-anim-breathe",
};

export function UserNameplate({ nameplate, children }: UserNameplateProps) {
  const gradientBg = nameplate.stops.length >= 2
    ? `linear-gradient(${nameplate.angle}deg, ${nameplate.stops.map(s => `${s.color} ${s.position}%`).join(", ")})`
    : nameplate.stops[0]?.color || "#5865f2";

  const patternId = `np-${Math.random().toString(36).slice(2, 8)}`;
  const animClass = nameplate.animation && nameplate.animation !== "none" ? ANIM_CLASS[nameplate.animation] || "" : "";

  return (
    <span
      className={cn("inline-flex items-center relative overflow-hidden text-white", animClass)}
      style={{
        background: gradientBg,
        borderRadius: `${nameplate.borderRadius}px`,
        padding: `${nameplate.paddingY}px ${nameplate.paddingX}px`,
        ...(nameplate.borderStyle ? { border: `2px ${nameplate.borderStyle} ${nameplate.borderColor}` } : {}),
        ...(nameplate.glow ? { boxShadow: `0 0 10px ${nameplate.glowColor}44, 0 0 3px ${nameplate.glowColor}66` } : {}),
      }}
    >
      {nameplate.pattern && (
        <span className="absolute inset-0 pointer-events-none" style={{ opacity: nameplate.patternOpacity / 100 }}>
          {nameplate.pattern === "dots" && (
            <svg width="100%" height="100%"><defs><pattern id={`${patternId}-d`} width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill={`url(#${patternId}-d)`}/></svg>
          )}
          {nameplate.pattern === "stripes" && (
            <svg width="100%" height="100%"><defs><pattern id={`${patternId}-s`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="white" strokeWidth="1.5"/></pattern></defs><rect width="100%" height="100%" fill={`url(#${patternId}-s)`}/></svg>
          )}
          {nameplate.pattern === "waves" && (
            <svg width="100%" height="100%"><defs><pattern id={`${patternId}-w`} width="20" height="10" patternUnits="userSpaceOnUse"><path d="M0 5 Q5 0 10 5 Q15 10 20 5" fill="none" stroke="white" strokeWidth="1"/></pattern></defs><rect width="100%" height="100%" fill={`url(#${patternId}-w)`}/></svg>
          )}
          {nameplate.pattern === "grid" && (
            <svg width="100%" height="100%"><defs><pattern id={`${patternId}-g`} width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0L0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill={`url(#${patternId}-g)`}/></svg>
          )}
          {nameplate.pattern === "diamonds" && (
            <svg width="100%" height="100%"><defs><pattern id={`${patternId}-dm`} width="12" height="12" patternUnits="userSpaceOnUse"><path d="M6 0L12 6L6 12L0 6Z" fill="none" stroke="white" strokeWidth="0.8"/></pattern></defs><rect width="100%" height="100%" fill={`url(#${patternId}-dm)`}/></svg>
          )}
        </span>
      )}
      <span className="relative z-10">{children}</span>
    </span>
  );
}
