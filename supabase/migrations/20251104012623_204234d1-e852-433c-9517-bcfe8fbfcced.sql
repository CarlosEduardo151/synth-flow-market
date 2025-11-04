-- Create tutorial completions table
CREATE TABLE IF NOT EXISTS tutorial_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_slug TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_slug)
);

-- Enable RLS
ALTER TABLE tutorial_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own tutorial completions
CREATE POLICY "Users can view their own tutorial completions"
  ON tutorial_completions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tutorial completions
CREATE POLICY "Users can insert their own tutorial completions"
  ON tutorial_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tutorial completions (to restart)
CREATE POLICY "Users can delete their own tutorial completions"
  ON tutorial_completions
  FOR DELETE
  USING (auth.uid() = user_id);