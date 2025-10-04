-- ============================================
-- 建立 scheduled_posts 表
-- 用途：儲存使用者的排程貼文內容和來源文章資訊
-- ============================================

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_title TEXT NOT NULL,  -- 來源文章標題，用於追蹤與分組
  content TEXT NOT NULL,        -- 貼文內容
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：加速按使用者和建立時間查詢
CREATE INDEX idx_scheduled_posts_user ON scheduled_posts(user_id, created_at DESC);

-- RLS 政策：使用者只能查看和操作自己的貼文
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled posts"
  ON scheduled_posts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled posts"
  ON scheduled_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled posts"
  ON scheduled_posts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled posts"
  ON scheduled_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- 觸發器：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_scheduled_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scheduled_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_posts_updated_at();
