-- ============================================
-- Rate Limiting - 防止 API 濫用
-- ============================================

-- 在 profiles 表新增 rate limiting 欄位
ALTER TABLE public.profiles
ADD COLUMN last_request_at TIMESTAMPTZ,
ADD COLUMN request_count_minute INTEGER DEFAULT 0;

-- 註解
COMMENT ON COLUMN public.profiles.last_request_at IS '最後一次 API 請求時間';
COMMENT ON COLUMN public.profiles.request_count_minute IS '當前分鐘的請求次數';

-- 創建函數：檢查並更新 rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_max_requests INTEGER DEFAULT 10
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_count INTEGER,
  reset_at TIMESTAMPTZ
) AS $$
DECLARE
  v_last_request TIMESTAMPTZ;
  v_count INTEGER;
  v_current_minute TIMESTAMPTZ;
BEGIN
  -- 取得當前分鐘的開始時間
  v_current_minute := date_trunc('minute', NOW());

  -- 取得使用者的最後請求時間和計數
  SELECT last_request_at, request_count_minute
  INTO v_last_request, v_count
  FROM profiles
  WHERE id = p_user_id;

  -- 如果是新的分鐘，重置計數
  IF v_last_request IS NULL OR date_trunc('minute', v_last_request) < v_current_minute THEN
    v_count := 0;
  END IF;

  -- 增加計數
  v_count := v_count + 1;

  -- 更新資料庫
  UPDATE profiles
  SET
    last_request_at = NOW(),
    request_count_minute = v_count
  WHERE id = p_user_id;

  -- 返回結果
  RETURN QUERY SELECT
    v_count <= p_max_requests AS allowed,
    v_count AS current_count,
    v_current_minute + INTERVAL '1 minute' AS reset_at;
END;
$$ LANGUAGE plpgsql;

-- 註解
COMMENT ON FUNCTION check_rate_limit IS '檢查使用者是否超過每分鐘請求限制，預設 10 次/分鐘';
