"use client";

import { useState } from "react";
import { useServerStore } from "@/stores/server-store";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface CreateServerModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateServerModal({ open, onClose }: CreateServerModalProps) {
  const router = useRouter();
  const createServer = useServerStore((s) => s.createServer);
  const joinServer = useServerStore((s) => s.joinServer);
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    setError(null);
    const server = await createServer(name.trim());
    if (server) {
      router.push(`/channels/${server.id}`);
      onClose();
      setName("");
    } else {
      setError("Failed to create server");
    }
    setIsLoading(false);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setIsLoading(true);
    setError(null);
    const success = await joinServer(inviteCode.trim());
    if (success) {
      onClose();
      setInviteCode("");
    } else {
      setError("Invalid invite code");
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Server</DialogTitle>
          <DialogDescription>
            Create your own server or join an existing one
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="create" className="flex-1">Create</TabsTrigger>
            <TabsTrigger value="join" className="flex-1">Join</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            {error && (
              <p className="text-discord-red text-sm">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="server-name">Server Name</Label>
              <Input
                id="server-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Server"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isLoading || !name.trim()}>
                {isLoading ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="join" className="space-y-4">
            {error && (
              <p className="text-discord-red text-sm">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter an invite code"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleJoin} disabled={isLoading || !inviteCode.trim()}>
                {isLoading ? "Joining..." : "Join Server"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
