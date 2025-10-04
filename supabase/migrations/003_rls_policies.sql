-- ============================================
-- Row Level Security (RLS) 政策
-- ============================================

-- ============================================
-- 啟用 RLS
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_quota ENABLE ROW LEVEL SECURITY;

-- ============================================
-- profiles 表 RLS
-- ============================================

-- 使用者可查看自己的 profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- 使用者可更新自己的 profile（僅限部分欄位）
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin 可查看所有 profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin 可更新所有 profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin 可新增 profiles（用於邀請使用者）
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- default_templates 表 RLS
-- ============================================

-- 所有人可查看預設模板
DROP POLICY IF EXISTS "Everyone can view default templates" ON public.default_templates;
CREATE POLICY "Everyone can view default templates"
  ON public.default_templates FOR SELECT
  USING (true);

-- 僅 Admin 可管理預設模板
DROP POLICY IF EXISTS "Only admins can manage default templates" ON public.default_templates;
CREATE POLICY "Only admins can manage default templates"
  ON public.default_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- templates 表 RLS
-- ============================================

-- 使用者可查看自己的模板
DROP POLICY IF EXISTS "Users can view own templates" ON public.templates;
CREATE POLICY "Users can view own templates"
  ON public.templates FOR SELECT
  USING (auth.uid() = user_id);

-- 使用者可新增自己的模板
DROP POLICY IF EXISTS "Users can insert own templates" ON public.templates;
CREATE POLICY "Users can insert own templates"
  ON public.templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 使用者可更新自己的模板
DROP POLICY IF EXISTS "Users can update own templates" ON public.templates;
CREATE POLICY "Users can update own templates"
  ON public.templates FOR UPDATE
  USING (auth.uid() = user_id);

-- 使用者可刪除自己的模板
DROP POLICY IF EXISTS "Users can delete own templates" ON public.templates;
CREATE POLICY "Users can delete own templates"
  ON public.templates FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- settings 表 RLS
-- ============================================

-- 使用者可查看自己的設定
DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
CREATE POLICY "Users can view own settings"
  ON public.settings FOR SELECT
  USING (auth.uid() = user_id);

-- 使用者可更新自己的設定
DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
CREATE POLICY "Users can update own settings"
  ON public.settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- history 表 RLS
-- ============================================

-- 使用者可查看自己的歷史記錄
DROP POLICY IF EXISTS "Users can view own history" ON public.history;
CREATE POLICY "Users can view own history"
  ON public.history FOR SELECT
  USING (auth.uid() = user_id);

-- 使用者可新增自己的歷史記錄
DROP POLICY IF EXISTS "Users can insert own history" ON public.history;
CREATE POLICY "Users can insert own history"
  ON public.history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 使用者可刪除自己的歷史記錄
DROP POLICY IF EXISTS "Users can delete own history" ON public.history;
CREATE POLICY "Users can delete own history"
  ON public.history FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- usage_quota 表 RLS
-- ============================================

-- 使用者可查看自己的配額
DROP POLICY IF EXISTS "Users can view own quota" ON public.usage_quota;
CREATE POLICY "Users can view own quota"
  ON public.usage_quota FOR SELECT
  USING (auth.uid() = user_id);

-- Admin 可查看所有配額
DROP POLICY IF EXISTS "Admins can view all quotas" ON public.usage_quota;
CREATE POLICY "Admins can view all quotas"
  ON public.usage_quota FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin 可更新所有配額
DROP POLICY IF EXISTS "Admins can update all quotas" ON public.usage_quota;
CREATE POLICY "Admins can update all quotas"
  ON public.usage_quota FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- usage_logs 表 RLS
-- ============================================

-- 使用者可查看自己的使用記錄
DROP POLICY IF EXISTS "Users can view own usage logs" ON public.usage_logs;
CREATE POLICY "Users can view own usage logs"
  ON public.usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Admin 可查看所有使用記錄
DROP POLICY IF EXISTS "Admins can view all usage logs" ON public.usage_logs;
CREATE POLICY "Admins can view all usage logs"
  ON public.usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- error_logs 表 RLS
-- ============================================

-- 僅 Admin 可查看錯誤日誌
DROP POLICY IF EXISTS "Only admins can view error logs" ON public.error_logs;
CREATE POLICY "Only admins can view error logs"
  ON public.error_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- admin_changelog 表 RLS
-- ============================================

-- 僅 Admin 可查看和管理更新記錄
DROP POLICY IF EXISTS "Only admins can manage changelog" ON public.admin_changelog;
CREATE POLICY "Only admins can manage changelog"
  ON public.admin_changelog FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 完成
-- ============================================
