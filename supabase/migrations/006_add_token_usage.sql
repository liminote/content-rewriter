-- ============================================
-- Add token usage tracking
-- ============================================

-- Add token usage columns to usage_logs
ALTER TABLE public.usage_logs
ADD COLUMN input_tokens INTEGER DEFAULT 0,
ADD COLUMN output_tokens INTEGER DEFAULT 0,
ADD COLUMN total_tokens INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.usage_logs.input_tokens IS 'Number of input tokens used';
COMMENT ON COLUMN public.usage_logs.output_tokens IS 'Number of output tokens used';
COMMENT ON COLUMN public.usage_logs.total_tokens IS 'Total tokens used (input + output)';
