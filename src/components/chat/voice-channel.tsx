"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  PhoneOff,
  Volume2,
  ScreenShare,
  Settings,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface VoiceParticipant {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_muted: boolean;
  is_deafened: boolean;
  is_screen_sharing: boolean;
  joined_at: string;
}

interface VoiceChannelViewProps {
  channelId: string;
  channelName: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function VoiceChannelView({ channelId, channelName }: VoiceChannelViewProps) {
  const user = useAuthStore((s) => s.user);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [presenceChannel, setPresenceChannel] = useState<RealtimeChannel | null>(null);
  const [connectionTime, setConnectionTime] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState("");
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

  // WebRTC refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const signalingChannelRef = useRef<RealtimeChannel | null>(null);
  const audioAnalysersRef = useRef<Map<string, { analyser: AnalyserNode; ctx: AudioContext }>>(new Map());

  // Timer for connection duration
  useEffect(() => {
    if (!connectionTime) { setElapsed(""); return; }
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(connectionTime).getTime();
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(hrs > 0 ? `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${mins}:${String(secs).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [connectionTime]);

  // Voice activity detection for local user
  useEffect(() => {
    if (!localStreamRef.current || !user) return;
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(localStreamRef.current);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animFrame: number;
    const check = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setSpeakingUsers((prev) => {
        const next = new Set(prev);
        if (avg > 15 && !isMuted) next.add(user.id);
        else next.delete(user.id);
        return next;
      });
      animFrame = requestAnimationFrame(check);
    };
    check();
    return () => {
      cancelAnimationFrame(animFrame);
      audioCtx.close();
    };
  }, [isConnected, isMuted, user]);

  const createPeerConnection = useCallback((remoteUserId: string) => {
    if (!user || !signalingChannelRef.current) return null;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        let audioEl = remoteAudioRefs.current.get(remoteUserId);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          remoteAudioRefs.current.set(remoteUserId, audioEl);
        }
        audioEl.srcObject = remoteStream;

        // Voice activity detection for remote user
        try {
          const audioCtx = new AudioContext();
          const source = audioCtx.createMediaStreamSource(remoteStream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          audioAnalysersRef.current.set(remoteUserId, { analyser, ctx: audioCtx });
        } catch { /* ignore */ }
      }
    };

    // Send ICE candidates via signaling
    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannelRef.current) {
        signalingChannelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: {
            from: user.id,
            to: remoteUserId,
            candidate: event.candidate.toJSON(),
          },
        });
      }
    };

    peerConnectionsRef.current.set(remoteUserId, pc);
    return pc;
  }, [user]);

  const handleOffer = useCallback(async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
    if (!user || !signalingChannelRef.current) return;
    let pc = peerConnectionsRef.current.get(fromUserId) ?? null;
    if (!pc) pc = createPeerConnection(fromUserId);
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    signalingChannelRef.current.send({
      type: "broadcast",
      event: "answer",
      payload: {
        from: user.id,
        to: fromUserId,
        answer: answer,
      },
    });
  }, [user, createPeerConnection]);

  const handleAnswer = useCallback(async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionsRef.current.get(fromUserId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  const handleIceCandidate = useCallback(async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionsRef.current.get(fromUserId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch { /* ignore */ }
    }
  }, []);

  // Monitor remote voice activity
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      audioAnalysersRef.current.forEach((val, remoteUserId) => {
        const dataArray = new Uint8Array(val.analyser.frequencyBinCount);
        val.analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setSpeakingUsers((prev) => {
          const next = new Set(prev);
          if (avg > 15) next.add(remoteUserId);
          else next.delete(remoteUserId);
          return next;
        });
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isConnected]);

  const joinChannel = useCallback(async () => {
    if (!user) return;

    // Get microphone
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      // If mic access denied, create silent stream
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const dest = ctx.createMediaStreamDestination();
      oscillator.connect(dest);
      oscillator.start();
      stream = dest.stream;
      // Immediately mute
      stream.getTracks().forEach(t => t.enabled = false);
      setIsMuted(true);
    }
    localStreamRef.current = stream;

    const supabase = createClient();

    // Set up signaling channel
    const sigChannel = supabase.channel(`voice-signal:${channelId}`);
    sigChannel
      .on("broadcast", { event: "offer" }, ({ payload }) => {
        if (payload.to === user.id) {
          handleOffer(payload.from, payload.offer);
        }
      })
      .on("broadcast", { event: "answer" }, ({ payload }) => {
        if (payload.to === user.id) {
          handleAnswer(payload.from, payload.answer);
        }
      })
      .on("broadcast", { event: "ice-candidate" }, ({ payload }) => {
        if (payload.to === user.id) {
          handleIceCandidate(payload.from, payload.candidate);
        }
      })
      .on("broadcast", { event: "new-peer" }, async ({ payload }) => {
        if (payload.user_id === user.id) return;
        // Create offer for new peer
        const pc = createPeerConnection(payload.user_id);
        if (!pc) return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sigChannel.send({
          type: "broadcast",
          event: "offer",
          payload: {
            from: user.id,
            to: payload.user_id,
            offer,
          },
        });
      })
      .on("broadcast", { event: "peer-left" }, ({ payload }) => {
        const pc = peerConnectionsRef.current.get(payload.user_id);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(payload.user_id);
        }
        const audioEl = remoteAudioRefs.current.get(payload.user_id);
        if (audioEl) {
          audioEl.pause();
          audioEl.srcObject = null;
          remoteAudioRefs.current.delete(payload.user_id);
        }
        const analyserData = audioAnalysersRef.current.get(payload.user_id);
        if (analyserData) {
          analyserData.ctx.close();
          audioAnalysersRef.current.delete(payload.user_id);
        }
      })
      .subscribe();

    signalingChannelRef.current = sigChannel;

    // Set up presence channel
    const channel = supabase.channel(`voice:${channelId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<VoiceParticipant>();
        const users: VoiceParticipant[] = [];
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => users.push(p as unknown as VoiceParticipant));
        });
        setParticipants(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const now = new Date().toISOString();
          await channel.track({
            user_id: user.id,
            username: user.username,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            is_muted: false,
            is_deafened: false,
            is_screen_sharing: false,
            joined_at: now,
          });
          setConnectionTime(now);

          // Announce to existing peers so they send offers
          sigChannel.send({
            type: "broadcast",
            event: "new-peer",
            payload: { user_id: user.id },
          });
        }
      });

    setPresenceChannel(channel);
    setIsConnected(true);
    setIsDeafened(false);
  }, [channelId, user, createPeerConnection, handleOffer, handleAnswer, handleIceCandidate]);

  const leaveChannel = useCallback(() => {
    // Clean up peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Clean up remote audio
    remoteAudioRefs.current.forEach((audioEl) => {
      audioEl.pause();
      audioEl.srcObject = null;
    });
    remoteAudioRefs.current.clear();

    // Clean up analysers
    audioAnalysersRef.current.forEach((val) => val.ctx.close());
    audioAnalysersRef.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    // Announce leaving
    if (signalingChannelRef.current && user) {
      signalingChannelRef.current.send({
        type: "broadcast",
        event: "peer-left",
        payload: { user_id: user.id },
      });
      signalingChannelRef.current.unsubscribe();
      signalingChannelRef.current = null;
    }

    if (presenceChannel) {
      presenceChannel.untrack();
      presenceChannel.unsubscribe();
    }
    setPresenceChannel(null);
    setIsConnected(false);
    setParticipants([]);
    setConnectionTime(null);
    setIsMuted(false);
    setIsDeafened(false);
    setSpeakingUsers(new Set());
  }, [presenceChannel, user]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      peerConnectionsRef.current.forEach((pc) => pc.close());
      remoteAudioRefs.current.forEach((audioEl) => { audioEl.pause(); audioEl.srcObject = null; });
      audioAnalysersRef.current.forEach((val) => val.ctx.close());
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (signalingChannelRef.current) {
        signalingChannelRef.current.unsubscribe();
      }
      if (presenceChannel) {
        presenceChannel.untrack();
        presenceChannel.unsubscribe();
      }
    };
  }, [presenceChannel]);

  const toggleMute = useCallback(async () => {
    if (!presenceChannel || !user) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    // Actually mute/unmute the mic track
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !newMuted;
      });
    }
    await presenceChannel.track({
      user_id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      is_muted: newMuted,
      is_deafened: isDeafened,
      is_screen_sharing: false,
      joined_at: connectionTime,
    });
  }, [presenceChannel, user, isMuted, isDeafened, connectionTime]);

  const toggleDeafen = useCallback(async () => {
    if (!presenceChannel || !user) return;
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    const newMuted = newDeafened ? true : isMuted;
    if (newDeafened) setIsMuted(true);

    // Mute local track
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !newMuted;
      });
    }

    // Mute/unmute all remote audio
    remoteAudioRefs.current.forEach((audioEl) => {
      audioEl.muted = newDeafened;
    });

    await presenceChannel.track({
      user_id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      is_muted: newMuted,
      is_deafened: newDeafened,
      is_screen_sharing: false,
      joined_at: connectionTime,
    });
  }, [presenceChannel, user, isMuted, isDeafened, connectionTime]);

  // Pre-join view
  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-discord-chat">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-discord-brand/20 flex items-center justify-center mx-auto">
            <Volume2 className="w-10 h-10 text-discord-brand" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{channelName}</h2>
            <p className="text-gray-400">Voice Channel</p>
          </div>
          {participants.length > 0 && (
            <div className="text-sm text-gray-400">
              {participants.length} user{participants.length !== 1 ? "s" : ""} connected
            </div>
          )}
          <Button
            onClick={joinChannel}
            className="bg-discord-green hover:bg-green-600 text-white px-8 py-3 rounded-full font-medium text-lg"
          >
            Join Voice
          </Button>
          <p className="text-xs text-gray-600">
            Your browser will ask for microphone permission
          </p>
        </div>
      </div>
    );
  }

  // Connected view
  return (
    <div className="flex-1 flex flex-col bg-discord-chat">
      {/* Header */}
      <div className="h-12 border-b border-gray-800 flex items-center px-4">
        <Volume2 className="w-5 h-5 text-gray-400 mr-2" />
        <h3 className="text-white font-semibold">{channelName}</h3>
        <span className="ml-2 text-xs text-discord-green font-medium">● Voice Connected</span>
        {elapsed && (
          <span className="ml-auto text-xs text-discord-green font-mono">{elapsed}</span>
        )}
      </div>

      {/* Participants grid */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
          {participants.map((p) => {
            const isSpeaking = speakingUsers.has(p.user_id);
            return (
              <div
                key={p.user_id}
                className={cn(
                  "flex flex-col items-center p-4 rounded-xl transition-all",
                  p.user_id === user?.id
                    ? "bg-discord-brand/10 ring-1 ring-discord-brand/30"
                    : "bg-discord-darker/50"
                )}
              >
                <div className="relative mb-3">
                  <Avatar className={cn(
                    "w-16 h-16 ring-2 transition-all",
                    isSpeaking && !p.is_muted
                      ? "ring-discord-green ring-[3px] shadow-lg shadow-green-500/20"
                      : p.is_muted ? "ring-red-500/50" : "ring-gray-600/50"
                  )}>
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {p.display_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  {p.is_muted && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                      <MicOff className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {p.is_deafened && (
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                      <HeadphoneOff className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-white text-center truncate w-full">
                  {p.display_name}
                </span>
                <span className="text-xs text-gray-500 truncate w-full text-center">
                  @{p.username}
                </span>
              </div>
            );
          })}
        </div>

        {participants.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            No one else is here yet...
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="border-t border-gray-800 bg-discord-darker/80 py-4 px-6">
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            onClick={toggleMute}
            className={cn(
              "w-12 h-12 rounded-full p-0",
              isMuted
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300"
                : "bg-white/10 text-white hover:bg-white/20"
            )}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            variant="ghost"
            onClick={toggleDeafen}
            className={cn(
              "w-12 h-12 rounded-full p-0",
              isDeafened
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300"
                : "bg-white/10 text-white hover:bg-white/20"
            )}
            title={isDeafened ? "Undeafen" : "Deafen"}
          >
            {isDeafened ? <HeadphoneOff className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
          </Button>

          <Button
            variant="ghost"
            className="w-12 h-12 rounded-full p-0 bg-white/10 text-white hover:bg-white/20"
            title="Screen Share"
            disabled
          >
            <ScreenShare className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            className="w-12 h-12 rounded-full p-0 bg-white/10 text-white hover:bg-white/20"
            title="Settings"
            disabled
          >
            <Settings className="w-5 h-5" />
          </Button>

          <div className="w-px h-8 bg-gray-700 mx-1" />

          <Button
            variant="ghost"
            onClick={leaveChannel}
            className="w-12 h-12 rounded-full p-0 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white"
            title="Disconnect"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
