-- Add extended configuration fields to ai_control_config
ALTER TABLE public.ai_control_config 
ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'gpt-4o-mini',
ADD COLUMN IF NOT EXISTS system_prompt text,
ADD COLUMN IF NOT EXISTS personality text,
ADD COLUMN IF NOT EXISTS action_instructions text,
ADD COLUMN IF NOT EXISTS memory_type text DEFAULT 'postgresql',
ADD COLUMN IF NOT EXISTS memory_connection_string text,
ADD COLUMN IF NOT EXISTS memory_session_id text,
ADD COLUMN IF NOT EXISTS temperature numeric DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS max_tokens integer DEFAULT 2048,
ADD COLUMN IF NOT EXISTS tools_enabled jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_credentials jsonb DEFAULT '{}'::jsonb;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_control_config_ai_model ON public.ai_control_config(ai_model);

-- Add comment for documentation
COMMENT ON TABLE public.ai_control_config IS 'Configuration for AI agents that syncs with n8n workflows';