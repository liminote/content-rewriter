-- ============================================
-- Reset all usage data to 0
-- ============================================

-- 1. Reset usage_quota table
UPDATE public.usage_quota
SET
  usage_count = 0,
  current_month = TO_CHAR(NOW(), 'YYYY-MM'),
  updated_at = NOW();

-- 2. Clear usage_logs table
TRUNCATE TABLE public.usage_logs;

-- 3. Clear history table
TRUNCATE TABLE public.history;
