# Supabase 資料庫設定

## 📁 Migration 檔案說明

### 執行順序

1. `001_initial_schema.sql` - 建立所有資料表
2. `002_triggers.sql` - 建立 Database Triggers
3. `003_rls_policies.sql` - 設定 Row Level Security 政策
4. `004_seed_data.sql` - 插入初始資料（預設模板）

## 🚀 如何在 Supabase 執行 Migrations

### 方法一：使用 Supabase Dashboard（建議）

1. 登入 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇你的專案
3. 點擊左側選單的 **SQL Editor**
4. 依序複製並執行以下檔案的內容：
   - `001_initial_schema.sql`
   - `002_triggers.sql`
   - `003_rls_policies.sql`
   - `004_seed_data.sql`
5. 每個檔案執行後，檢查是否有錯誤訊息

### 方法二：使用 Supabase CLI

如果你有安裝 Supabase CLI，可以使用以下指令：

```bash
# 1. 初始化 Supabase 專案（如果還沒做過）
npx supabase init

# 2. 連結到你的 Supabase 專案
npx supabase link --project-ref <your-project-ref>

# 3. 將 migration 檔案放到正確位置
# （檔案已經在 supabase/migrations/ 目錄中）

# 4. 執行 migrations
npx supabase db push

# 5. 查看資料庫狀態
npx supabase db status
```

## 📊 資料表結構

### 核心表格

- **profiles** - 使用者資料
- **templates** - 使用者個人模板
- **default_templates** - 系統預設模板
- **settings** - 使用者設定
- **history** - 歷史記錄
- **usage_quota** - 使用量配額

### 管理與日誌

- **usage_logs** - 使用記錄
- **error_logs** - 錯誤日誌
- **admin_changelog** - 管理員更新記錄

## 🔐 Row Level Security (RLS)

所有表格都已啟用 RLS，確保資料安全：

- 使用者只能存取自己的資料
- Admin 角色可以存取所有資料
- 公開資料（如 default_templates）所有人可讀取

## 🎯 Triggers 功能

### 自動化功能

1. **新使用者自動建立**：
   - auth.users 新增時，自動建立 profiles 記錄
   - 自動建立 settings（預設 AI 為 gemini）
   - 自動建立 usage_quota（月配額 100）
   - 自動複製所有啟用的預設模板

2. **自動更新時間戳記**：
   - 所有表格的 `updated_at` 欄位會在更新時自動設定為當前時間

## 📝 初始資料

執行 `004_seed_data.sql` 後，系統會建立 3 個預設模板：

1. **專業風格** - 適合商業或專業領域
2. **輕鬆風格** - 親切、口語化
3. **故事風格** - 敘事方式呈現

## 🔧 設定管理員帳號

執行完 migrations 後，需要手動設定管理員：

### 方法一：使用 SQL Editor

```sql
-- 將指定使用者設為管理員
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

### 方法二：使用 Supabase Dashboard

1. 前往 **Authentication** → **Users**
2. 建立新使用者或選擇現有使用者
3. 前往 **Table Editor** → **profiles**
4. 找到該使用者的記錄
5. 將 `role` 欄位改為 `admin`

## ✅ 驗證資料庫設定

執行以下 SQL 來檢查設定是否正確：

```sql
-- 檢查所有表格是否建立成功
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 檢查預設模板是否建立成功
SELECT id, name, "order", is_active
FROM public.default_templates
ORDER BY "order";

-- 檢查 RLS 是否啟用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 檢查 Triggers 是否建立成功
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

## 🐛 常見問題

### Q: 執行 migration 時出現權限錯誤

**A:** 確保你使用的是 Supabase 專案的 Service Role Key，或者在 Dashboard 的 SQL Editor 中執行（會自動使用正確的權限）。

### Q: Trigger 沒有正常運作

**A:** 檢查 Trigger 函式是否正確建立，可以使用以下 SQL：

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';
```

### Q: RLS 阻止了我的查詢

**A:** 如果在開發階段需要繞過 RLS，可以在後端使用 Service Role Key。前端應該使用 Anon Key，並正確設定 auth session。

## 📚 相關文件

- [Supabase Database 文件](https://supabase.com/docs/guides/database)
- [Row Level Security 文件](https://supabase.com/docs/guides/auth/row-level-security)
- [專案技術設計文件](../TECHNICAL_DESIGN.md)

---

**建立日期**：2025-10-03
