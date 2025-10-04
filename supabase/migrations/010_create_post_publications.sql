-- ============================================
-- 建立 post_publications 表
-- 用途：儲存平台專屬的發佈記錄（支援多平台）
-- ============================================

CREATE TABLE IF NOT EXISTS post_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 平台資訊
  platform TEXT NOT NULL CHECK (platform IN ('threads', 'facebook', 'instagram')),

  -- 狀態管理
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,     -- 排程發佈時間（NULL = 立即發佈）
  published_at TIMESTAMPTZ,      -- 實際發佈時間

  -- 平台專屬內容
  hashtags TEXT[],               -- 各平台可設定不同的 hashtags

  -- 平台回傳資料
  platform_post_id TEXT,         -- 平台上的貼文 ID
  platform_post_url TEXT,        -- 平台上的貼文 URL

  -- 互動數據
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,

  -- 錯誤處理
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- 時間戳記
  last_synced_at TIMESTAMPTZ,    -- 最後同步互動數據時間
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：加速查詢
CREATE INDEX idx_publications_post ON post_publications(post_id);
CREATE INDEX idx_publications_user_status ON post_publications(user_id, status, scheduled_at);
CREATE INDEX idx_publications_platform ON post_publications(platform, status);

-- RLS 政策：使用者只能查看和操作自己的發佈記錄
ALTER TABLE post_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own publications"
  ON post_publications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own publications"
  ON post_publications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own publications"
  ON post_publications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own publications"
  ON post_publications
  FOR DELETE
  USING (auth.uid() = user_id);
