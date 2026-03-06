"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Flag, CheckCircle, Eye, XCircle, Clock, MessageSquare, User as UserIcon, Server, Trash2, Gavel, Image as ImageIcon } from "lucide-react";
import { Report, ReportStatus, User, Message, Attachment } from "@/types";
import { formatRelativeTime } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type ReportWithJoins = Report & {
  reporter?: User | null;
  target_user?: User | null;
};

type MessageWithAuthor = Message & {
  author?: User | null;
  attachments?: Attachment[];
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReportStatus | "all">("all");
  const [selectedReport, setSelectedReport] = useState<ReportWithJoins | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [reportedMessage, setReportedMessage] = useState<MessageWithAuthor | null>(null);
  const [messageDeleted, setMessageDeleted] = useState(false);
  const [showPunishDialog, setShowPunishDialog] = useState(false);
  const [punishType, setPunishType] = useState("warn");
  const [punishReason, setPunishReason] = useState("");
  const [punishDuration, setPunishDuration] = useState("7");
  const [punishExpiry, setPunishExpiry] = useState("30");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("reports")
      .select("*, reporter:users!reports_reporter_id_fkey(*), target_user:users!reports_target_user_id_fkey(*)")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setReports((data as Report[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateReportStatus = async (reportId: string, status: ReportStatus, note?: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const updateData: Record<string, unknown> = { status };
    if (note) updateData.resolution_note = note;
    if (user) updateData.resolved_by = user.id;
    await supabase.from("reports").update(updateData).eq("id", reportId);
    await fetchReports();
    setSelectedReport(null);
    setResolutionNote("");
    setReportedMessage(null);
  };

  // Fetch reported message when a message report is selected
  useEffect(() => {
    if (!selectedReport?.target_message_id) {
      setReportedMessage(null);
      setMessageDeleted(false);
      return;
    }
    const fetchMessage = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("messages")
        .select("*, author:users!messages_author_id_fkey(*), attachments(*)")
        .eq("id", selectedReport.target_message_id!)
        .maybeSingle();
      if (error || !data) {
        setReportedMessage(null);
        setMessageDeleted(true);
      } else {
        setReportedMessage(data as MessageWithAuthor);
        setMessageDeleted(false);
      }
    };
    fetchMessage();
  }, [selectedReport?.target_message_id]);

  const handleDeleteMessage = async () => {
    if (!selectedReport?.target_message_id) return;
    const supabase = createClient();
    await supabase.from("messages").delete().eq("id", selectedReport.target_message_id);
    setReportedMessage(null);
    setMessageDeleted(true);
  };

  const handlePunishUser = async () => {
    if (!selectedReport?.target_user_id || !punishReason.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const durationDays = parseInt(punishDuration) || null;
    const expiryDays = parseInt(punishExpiry) || null;
    const expiresAt = durationDays ? new Date(Date.now() + durationDays * 86400000).toISOString() : null;
    const becomesPastAt = expiryDays ? new Date(Date.now() + expiryDays * 86400000).toISOString() : null;

    await supabase.from("user_punishments").insert({
      user_id: selectedReport.target_user_id,
      type: punishType,
      reason: punishReason,
      issued_by: user.id,
      expires_at: expiresAt,
      becomes_past_at: becomesPastAt,
      is_active: true,
      popup_shown: false,
    });

    // Update user enforcement flags
    const updateData: Record<string, unknown> = {};
    if (punishType === "mute") {
      updateData.is_muted = true;
      updateData.mute_reason = punishReason;
      updateData.mute_end = expiresAt;
    } else if (punishType === "suspend") {
      updateData.is_suspended = true;
      updateData.suspension_reason = punishReason;
      updateData.suspension_end = expiresAt;
    } else if (punishType === "ban") {
      updateData.is_banned = true;
      updateData.is_suspended = true;
      updateData.ban_reason = punishReason;
      updateData.banned_by = user.id;
      updateData.suspension_reason = punishReason;
      updateData.suspension_end = expiresAt;
    }
    if (Object.keys(updateData).length > 0) {
      await supabase.from("users").update(updateData).eq("id", selectedReport.target_user_id);
    }
    setShowPunishDialog(false);
    setPunishReason("");
    setPunishType("warn");
  };

  const statusColors: Record<string, string> = {
    open: "bg-yellow-500/20 text-yellow-400",
    reviewing: "bg-blue-500/20 text-blue-400",
    resolved: "bg-green-500/20 text-green-400",
    dismissed: "bg-gray-500/20 text-gray-400",
  };

  const statusIcon: Record<string, React.ReactNode> = {
    open: <Clock className="w-3 h-3" />,
    reviewing: <Eye className="w-3 h-3" />,
    resolved: <CheckCircle className="w-3 h-3" />,
    dismissed: <XCircle className="w-3 h-3" />,
  };

  const typeIcon: Record<string, React.ReactNode> = {
    user: <UserIcon className="w-4 h-4" />,
    message: <MessageSquare className="w-4 h-4" />,
    server: <Server className="w-4 h-4" />,
  };

  const getOpenCount = () => reports.filter((r) => r.status === "open").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Flag className="w-6 h-6 text-orange-400" />
            Reports
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Review and manage user-submitted reports
          </p>
        </div>
        {getOpenCount() > 0 && (
          <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
            {getOpenCount()} open
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "open", "reviewing", "resolved", "dismissed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-4 py-2 rounded-md text-sm capitalize transition-colors",
              filter === s
                ? "bg-discord-brand text-white"
                : "bg-discord-dark text-gray-400 hover:bg-discord-hover"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-gray-400 text-center py-8">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <Flag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No reports found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <div
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className={cn(
                "bg-discord-dark rounded-lg p-4 border cursor-pointer transition-all hover:border-gray-600",
                selectedReport?.id === report.id ? "border-discord-brand" : "border-gray-800"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-gray-400">{typeIcon[report.report_type]}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm capitalize">
                        {report.report_type} Report
                      </span>
                      <Badge className={cn("text-[10px]", statusColors[report.status])}>
                        <span className="flex items-center gap-1">{statusIcon[report.status]} {report.status}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-300 mt-1">{report.reason}</p>
                    {report.details && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{report.details}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>
                        By: {report.reporter?.display_name || "Unknown"}
                      </span>
                      {report.target_user && (
                        <span>
                          Target: {report.target_user?.display_name}
                        </span>
                      )}
                      <span>{formatRelativeTime(report.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedReport && (
        <div className="bg-discord-darker rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            Report Detail
            <Badge className={cn("text-xs", statusColors[selectedReport.status])}>
              {selectedReport.status}
            </Badge>
          </h3>

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-500">Type:</span>
              <span className="text-white ml-2 capitalize">{selectedReport.report_type}</span>
            </div>
            <div>
              <span className="text-gray-500">Reason:</span>
              <span className="text-white ml-2">{selectedReport.reason}</span>
            </div>
            <div>
              <span className="text-gray-500">Reporter:</span>
              <span className="text-white ml-2">{selectedReport.reporter?.display_name || selectedReport.reporter_id}</span>
            </div>
            {selectedReport.target_user_id && (
              <div>
                <span className="text-gray-500">Target User:</span>
                <span className="text-white ml-2">{selectedReport.target_user?.display_name || selectedReport.target_user_id}</span>
              </div>
            )}
            {selectedReport.target_message_id && (
              <div className="col-span-2">
                <span className="text-gray-500">Message ID:</span>
                <span className="text-white ml-2 font-mono text-xs">{selectedReport.target_message_id}</span>
              </div>
            )}
            {selectedReport.target_server_id && (
              <div>
                <span className="text-gray-500">Server ID:</span>
                <span className="text-white ml-2 font-mono text-xs">{selectedReport.target_server_id}</span>
              </div>
            )}
          </div>

          {/* Reported message preview */}
          {selectedReport.target_message_id && (
            <div className="bg-discord-dark rounded-lg p-4 mb-4 border border-gray-700">
              <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Reported Message</p>
              {messageDeleted ? (
                <p className="text-sm text-red-400 italic">Message has been deleted.</p>
              ) : reportedMessage ? (
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                    <AvatarImage src={reportedMessage.author?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{reportedMessage.author?.display_name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{reportedMessage.author?.display_name || "Unknown"}</span>
                      <span className="text-xs text-gray-500">@{reportedMessage.author?.username || "unknown"}</span>
                      <span className="text-xs text-gray-600">{new Date(reportedMessage.created_at).toLocaleString()}</span>
                    </div>
                    {reportedMessage.content && (
                      <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{reportedMessage.content}</p>
                    )}
                    {reportedMessage.attachments && reportedMessage.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {reportedMessage.attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-1.5 bg-discord-darker rounded px-2 py-1">
                            <ImageIcon className="w-3 h-3 text-gray-400" />
                            <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-discord-brand hover:underline truncate max-w-[200px]">
                              {att.file_name}
                            </a>
                            <span className="text-[10px] text-gray-500">({(att.file_size / 1024).toFixed(1)} KB)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic animate-pulse">Loading message...</p>
              )}
            </div>
          )}

          {/* Quick Actions */}
          {(selectedReport.status === "open" || selectedReport.status === "reviewing") && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedReport.target_message_id && !messageDeleted && reportedMessage && (
                <Button
                  size="sm"
                  onClick={handleDeleteMessage}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Delete Message
                </Button>
              )}
              {selectedReport.target_user_id && (
                <Button
                  size="sm"
                  onClick={() => {
                    setPunishReason(selectedReport.reason || "");
                    setPunishType("warn");
                    setPunishDuration("7");
                    setPunishExpiry("30");
                    setShowPunishDialog(true);
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Gavel className="w-3 h-3 mr-1" /> Punish User
                </Button>
              )}
            </div>
          )}

          {selectedReport.details && (
            <div className="bg-discord-dark rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">Details:</p>
              <p className="text-sm text-gray-300">{selectedReport.details}</p>
            </div>
          )}

          {selectedReport.resolution_note && (
            <div className="bg-green-500/10 rounded-lg p-3 mb-4 border border-green-500/20">
              <p className="text-xs text-green-400 mb-1">Resolution Note:</p>
              <p className="text-sm text-green-300">{selectedReport.resolution_note}</p>
            </div>
          )}

          {(selectedReport.status === "open" || selectedReport.status === "reviewing") && (
            <div className="space-y-3">
              <Input
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Resolution note (optional)..."
                className="text-sm"
              />
              <div className="flex gap-2">
                {selectedReport.status === "open" && (
                  <Button
                    size="sm"
                    onClick={() => updateReportStatus(selectedReport.id, "reviewing")}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Eye className="w-3 h-3 mr-1" /> Mark Reviewing
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => updateReportStatus(selectedReport.id, "resolved", resolutionNote || undefined)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-3 h-3 mr-1" /> Resolve
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateReportStatus(selectedReport.id, "dismissed", resolutionNote || undefined)}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  <XCircle className="w-3 h-3 mr-1" /> Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Punish User Dialog */}
      <Dialog open={showPunishDialog} onOpenChange={setShowPunishDialog}>
        <DialogContent className="bg-discord-darker border-gray-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Gavel className="w-5 h-5 text-orange-400" />
              Punish User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Target</p>
              <p className="text-sm text-white">{selectedReport?.target_user?.display_name || "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Type</p>
              <select
                value={punishType}
                onChange={(e) => setPunishType(e.target.value)}
                className="w-full bg-discord-dark border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-discord-brand"
              >
                <option value="warn">Warn</option>
                <option value="mute">Mute</option>
                <option value="suspend">Suspend</option>
                <option value="ban">Ban</option>
              </select>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Reason</p>
              <textarea
                value={punishReason}
                onChange={(e) => setPunishReason(e.target.value)}
                className="w-full h-20 bg-discord-dark border border-gray-700 rounded-md px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-discord-brand"
                placeholder="Reason for punishment..."
              />
            </div>
            {punishType !== "warn" && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Duration (days)</p>
                <Input
                  type="number"
                  value={punishDuration}
                  onChange={(e) => setPunishDuration(e.target.value)}
                  min="1"
                  placeholder="7"
                  className="text-sm"
                />
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Standing Expiry (days)</p>
              <Input
                type="number"
                value={punishExpiry}
                onChange={(e) => setPunishExpiry(e.target.value)}
                min="1"
                placeholder="30"
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">How long this affects user standing</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPunishDialog(false)}>Cancel</Button>
            <Button
              onClick={handlePunishUser}
              disabled={!punishReason.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Issue Punishment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
