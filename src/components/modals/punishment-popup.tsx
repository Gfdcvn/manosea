"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getStandingInfo } from "@/lib/utils";
import { Punishment } from "@/types";

export function PunishmentPopup() {
  const user = useAuthStore((s) => s.user);
  const [punishment, setPunishment] = useState<Punishment | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkPunishments = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_punishments")
        .select("*")
        .eq("user_id", user.id)
        .eq("popup_shown", false)
        .eq("is_active", true)
        .order("issued_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setPunishment(data);
        setOpen(true);
      }
    };

    checkPunishments();
  }, [user]);

  const handleAcknowledge = async () => {
    if (!punishment) return;
    const supabase = createClient();
    await supabase
      .from("user_punishments")
      .update({ popup_shown: true })
      .eq("id", punishment.id);
    setOpen(false);
    setPunishment(null);
  };

  if (!punishment) return null;

  const standingInfo = getStandingInfo(user?.standing_level || 0);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-discord-red text-xl">
            You have received a {punishment.type}.
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-4 text-gray-300">
            <p>
              For the following reason: <strong>{punishment.reason}</strong>.
            </p>
            {punishment.expires_at && (
              <p>
                For: <strong>{Math.ceil((new Date(punishment.expires_at).getTime() - Date.now()) / 86400000)} days</strong>.
              </p>
            )}
            <p>
              Your account standing has been updated to{" "}
              <span className={standingInfo.color}>{standingInfo.title}</span>.
            </p>
            {punishment.becomes_past_at && (
              <p>
                This action will expire at{" "}
                <strong>{new Date(punishment.becomes_past_at).toLocaleDateString()}</strong>.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleAcknowledge} className="w-full">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
