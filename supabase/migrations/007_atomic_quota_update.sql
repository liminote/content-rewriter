-- ============================================
-- 原子性更新 usage_quota
-- ============================================

-- 創建函數：原子性增加 usage_count
CREATE OR REPLACE FUNCTION increment_usage_count(
  p_user_id UUID,
  p_increment INTEGER
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  monthly_limit INTEGER,
  current_month TEXT,
  usage_count INTEGER,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  UPDATE usage_quota
  SET
    usage_count = usage_quota.usage_count + p_increment,
    updated_at = NOW()
  WHERE usage_quota.user_id = p_user_id
  RETURNING
    usage_quota.id,
    usage_quota.user_id,
    usage_quota.monthly_limit,
    usage_quota.current_month,
    usage_quota.usage_count,
    usage_quota.updated_at;
END;
$$ LANGUAGE plpgsql;

-- 註解
COMMENT ON FUNCTION increment_usage_count IS '原子性增加使用者的 usage_count，避免併發更新時的 race condition';
