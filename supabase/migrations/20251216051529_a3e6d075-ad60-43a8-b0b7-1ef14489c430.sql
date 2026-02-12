-- Add session_number column as a simple unique number
ALTER TABLE public.financial_chat_sessions 
ADD COLUMN session_number BIGINT UNIQUE;

-- Create a sequence for generating unique session numbers (starting from 1000000 for phone-like format)
CREATE SEQUENCE IF NOT EXISTS financial_session_number_seq START WITH 1000001;

-- Update existing sessions with unique numbers
UPDATE public.financial_chat_sessions 
SET session_number = nextval('financial_session_number_seq')
WHERE session_number IS NULL;

-- Make session_number NOT NULL and set default
ALTER TABLE public.financial_chat_sessions 
ALTER COLUMN session_number SET NOT NULL,
ALTER COLUMN session_number SET DEFAULT nextval('financial_session_number_seq');

-- Create index for faster lookups
CREATE INDEX idx_financial_chat_sessions_session_number ON public.financial_chat_sessions(session_number);