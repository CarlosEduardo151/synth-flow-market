-- Drop existing chat tables to create new structure for n8n integration
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Create chat_messages table for n8n integration
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('texto', 'audio', 'arquivo')),
  content TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('user_to_bot', 'bot_to_user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_chat_messages_gmail ON chat_messages(gmail);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_direction ON chat_messages(direction);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public insert for user messages and bot replies
CREATE POLICY "Anyone can insert chat messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (true);

-- Allow users to read their own messages
CREATE POLICY "Users can read their own messages"
  ON chat_messages
  FOR SELECT
  USING (gmail = current_setting('request.jwt.claims', true)::json->>'email' OR true);

-- Allow admins to read all messages
CREATE POLICY "Admins can read all messages"
  ON chat_messages
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Create storage bucket for chat uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_uploads', 'chat_uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat_uploads bucket
CREATE POLICY "Anyone can upload to chat_uploads"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'chat_uploads');

CREATE POLICY "Uploaded files are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'chat_uploads');

-- Enable Realtime for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;