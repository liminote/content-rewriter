-- ============================================
-- Database Triggers
-- ============================================

-- ============================================
-- 1. 自動建立 profiles 記錄
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, is_active, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'user', true, NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 建立 Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. 自動更新 updated_at 欄位
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為各表建立 updated_at 自動更新 Trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_default_templates_updated_at ON public.default_templates;
CREATE TRIGGER update_default_templates_updated_at
  BEFORE UPDATE ON public.default_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_usage_quota_updated_at ON public.usage_quota;
CREATE TRIGGER update_usage_quota_updated_at
  BEFORE UPDATE ON public.usage_quota
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_changelog_updated_at ON public.admin_changelog;
CREATE TRIGGER update_admin_changelog_updated_at
  BEFORE UPDATE ON public.admin_changelog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. 使用者首次登入自動建立 settings 和 usage_quota
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- 建立預設 settings
  INSERT INTO public.settings (user_id, default_ai, updated_at)
  VALUES (NEW.id, 'gemini', NOW());

  -- 建立預設 usage_quota
  INSERT INTO public.usage_quota (
    user_id,
    monthly_limit,
    current_month,
    usage_count,
    updated_at
  )
  VALUES (
    NEW.id,
    100,
    TO_CHAR(NOW(), 'YYYY-MM'),
    0,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 建立 Trigger
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ============================================
-- 4. 自動複製預設模板給新使用者
-- ============================================
CREATE OR REPLACE FUNCTION public.copy_default_templates_to_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 複製所有啟用的預設模板
  INSERT INTO public.templates (user_id, name, prompt, "order", is_default, created_at, updated_at)
  SELECT
    NEW.id,
    name,
    prompt,
    "order",
    true,
    NOW(),
    NOW()
  FROM public.default_templates
  WHERE is_active = true
  ORDER BY "order";

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 建立 Trigger
DROP TRIGGER IF EXISTS on_profile_created_copy_templates ON public.profiles;
CREATE TRIGGER on_profile_created_copy_templates
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.copy_default_templates_to_user();

-- ============================================
-- 完成
-- ============================================
