-- Add discoverable flag to servers
ALTER TABLE servers ADD COLUMN IF NOT EXISTS is_discoverable boolean DEFAULT false;

-- Allow anyone to read discoverable servers (for explore page)
CREATE POLICY "Anyone can view discoverable servers"
  ON servers FOR SELECT
  USING (is_discoverable = true);

-- Allow counting members for discoverable servers
CREATE POLICY "Anyone can count members of discoverable servers"
  ON server_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM servers WHERE servers.id = server_members.server_id AND servers.is_discoverable = true
    )
  );
