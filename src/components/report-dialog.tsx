"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ReportType } from "@/types";

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  reportType: ReportType;
  targetUserId?: string;
  targetMessageId?: string;
  targetServerId?: string;
  targetInfo?: string; // Display name or info about what's being reported
}

const REPORT_REASONS = [
  "Spam or advertising",
  "Harassment or abuse",
  "Inappropriate content",
  "Impersonation",
  "Ban evasion",
  "Underage user",
  "Other",
];

export function ReportDialog({
  open,
  onClose,
  reportType,
  targetUserId,
  targetMessageId,
  targetServerId,
  targetInfo,
}: ReportDialogProps) {
  const user = useAuthStore((s) => s.user);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from("reports").insert({
      reporter_id: user.id,
      report_type: reportType,
      target_user_id: targetUserId || null,
      target_message_id: targetMessageId || null,
      target_server_id: targetServerId || null,
      reason,
      details: details || null,
      status: "open",
    });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setReason("");
      setDetails("");
      onClose();
    }, 1500);
  };

  const typeLabel =
    reportType === "user" ? "User" : reportType === "message" ? "Message" : "Server";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Report {typeLabel}
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <p className="text-green-400 font-semibold">Report submitted</p>
            <p className="text-gray-400 text-sm mt-1">Thank you. Our team will review it.</p>
          </div>
        ) : (
          <>
            {targetInfo && (
              <div className="bg-discord-darker rounded-lg p-3 text-sm text-gray-300 border border-gray-800">
                Reporting: <span className="font-medium text-white">{targetInfo}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-gray-300 uppercase mb-2">Reason</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setReason(r)}
                      className={`text-xs px-3 py-2 rounded-md transition-colors text-left ${
                        reason === r
                          ? "bg-discord-brand text-white"
                          : "bg-discord-dark text-gray-400 hover:bg-discord-hover"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-300 uppercase mb-1">
                  Additional Details (optional)
                </Label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide more context..."
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-discord-dark border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-discord-brand resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="bg-discord-red hover:bg-discord-red-hover text-white"
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
