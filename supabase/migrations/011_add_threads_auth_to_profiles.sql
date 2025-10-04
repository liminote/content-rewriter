-- ============================================
-- 在 profiles 表中新增 Threads OAuth 欄位
-- 用途：儲存使用者的 Threads 帳號授權資訊
-- ============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS threads_access_token TEXT,
ADD COLUMN IF NOT EXISTS threads_user_id TEXT,
ADD COLUMN IF NOT EXISTS threads_token_expires_at TIMESTAMPTZ;

-- 註解說明
COMMENT ON COLUMN profiles.threads_access_token IS 'Threads API 存取權杖（已加密）';
COMMENT ON COLUMN profiles.threads_user_id IS 'Threads 使用者 ID';
COMMENT ON COLUMN profiles.threads_token_expires_at IS 'Threads 權杖過期時間';
