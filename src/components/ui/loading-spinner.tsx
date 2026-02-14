"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  className?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({
  size = "md",
  label,
  className,
  fullPage = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-[3px]",
    lg: "w-12 h-12 border-4",
    xl: "w-16 h-16 border-4",
  };

  const spinner = (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "rounded-full border-discord-brand border-t-transparent animate-spin",
          sizeClasses[size]
        )}
      />
      {label && (
        <p className="text-sm text-discord-muted animate-pulse">{label}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-discord-chat">
        {spinner}
      </div>
    );
  }

  return spinner;
}
