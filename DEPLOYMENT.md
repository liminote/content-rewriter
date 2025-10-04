# Content Rewriter 部署指南

## 文件版本
- **版本**: 1.0
- **更新日期**: 2025-10-04
- **適用環境**: Production / Staging

---

## 1. 部署前檢查清單

### 1.1 環境變數確認

**Vercel 必要環境變數**:

| 變數名稱 | 用途 | 範例 | 環境 |
|---------|------|------|------|
| `VITE_SUPABASE_URL` | Supabase 專案 URL | `https://xxx.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名金鑰 | `eyJhbGc...` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服務金鑰（後端用） | `eyJhbGc...` | Production |
| `GEMINI_API_KEY` | Google Gemini API 金鑰 | `AIzaSyC...` | Production |

**選用環境變數**:
```bash
CLAUDE_API_KEY=sk-ant-xxx       # 未來支援 Claude 時使用
OPENAI_API_KEY=sk-xxx           # 未來支援 OpenAI 時使用
SENTRY_DSN=https://xxx          # 錯誤監控（建議）
```

### 1.2 資料庫 Migrations 確認

**執行順序**（確保所有 migrations 已執行）:

```sql
-- 在 Supabase SQL Editor 依序執行：

-- 1. 基礎 Schema
001_initial_schema.sql

-- 2. 認證系統
002_auth_setup.sql

-- 3. RLS 政策
003_rls_policies.sql

-- 4. 系統預設模板
004_default_templates.sql

-- 5. 歷史記錄
005_history_table.sql

-- 6. 使用量配額
006_usage_quota.sql

-- 7. 原子性更新（重要！）
007_atomic_quota_update.sql

-- 8. Rate Limiting（重要！）
008_add_rate_limiting.sql
```

**驗證方式**:
```sql
-- 檢查函數是否存在
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('increment_usage_count', 'check_rate_limit');

-- 檢查欄位是否存在
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('last_request_at', 'request_count_minute');
```

### 1.3 程式碼檢查

```bash
# 執行 TypeScript 型別檢查
npm run type-check

# 執行 Lint 檢查
npm run lint

# 執行測試（如果有）
npm run test

# 建置測試
npm run build
```

---

## 2. Vercel 部署步驟

### 2.1 首次部署

```bash
# 1. 安裝 Vercel CLI
npm i -g vercel

# 2. 登入 Vercel
vercel login

# 3. 連結專案（在專案根目錄執行）
vercel link

# 4. 設定環境變數
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add GEMINI_API_KEY production

# 5. 執行正式部署
vercel --prod
```

### 2.2 後續更新部署

```bash
# 直接推送到 main branch 會自動部署
git push origin main

# 或手動觸發部署
vercel --prod
```

### 2.3 Vercel 專案設定

確認 `vercel.json` 設定正確:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 3. Supabase 設定

### 3.1 啟用必要功能

在 Supabase Dashboard 確認：

1. **Authentication** → Email Provider 已啟用
2. **Database** → RLS 已在所有表上啟用
3. **API** → URL 和金鑰正確複製

### 3.2 初始管理員帳號建立

```sql
-- 1. 在 Supabase Dashboard 註冊第一個使用者
-- Authentication → Users → Invite user

-- 2. 將該使用者設為管理員
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@example.com';

-- 3. 建立該使用者的配額記錄（如果沒有）
INSERT INTO usage_quota (user_id, monthly_limit, current_month, usage_count)
VALUES (
  (SELECT id FROM profiles WHERE email = 'admin@example.com'),
  99999,  -- 管理員通常給高額度
  TO_CHAR(NOW(), 'YYYY-MM'),
  0
);
```

### 3.3 系統預設模板建立

確保 `004_default_templates.sql` 已執行，或手動新增：

```sql
INSERT INTO default_templates (name, prompt, "order", is_active) VALUES
('專業風格', '請將以下文章改寫為專業、正式的風格...', 1, true),
('輕鬆風格', '請將以下文章改寫為輕鬆、親切的風格...', 2, true),
('簡潔風格', '請將以下文章精簡為 100 字以內...', 3, true);
```

---

## 4. 部署後驗證

### 4.1 前端功能測試

訪問 Production URL，依序測試：

- [ ] 登入功能正常
- [ ] 工作區載入模板列表
- [ ] 產出功能正常（選擇模板 → 輸入文章 → 產出）
- [ ] 歷史記錄顯示正常
- [ ] 設定頁面可更新資料
- [ ] 登出功能正常

### 4.2 API 端點測試

```bash
# 取得 JWT Token（先登入前端，從瀏覽器 DevTools 取得）
export TOKEN="eyJhbGc..."

# 測試 /api/generate
curl -X POST https://your-domain.vercel.app/api/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "article": "測試文章內容",
    "template_ids": ["uuid-1", "uuid-2"],
    "ai_engine": "gemini"
  }'
```

### 4.3 資料庫驗證

```sql
-- 檢查使用者建立是否正常
SELECT COUNT(*) FROM profiles;

-- 檢查模板是否載入
SELECT COUNT(*) FROM default_templates WHERE is_active = true;

-- 檢查配額記錄
SELECT * FROM usage_quota LIMIT 5;
```

### 4.4 Rate Limiting 測試

執行 `scripts/test-fixes.ts`:

```bash
npx tsx scripts/test-fixes.ts
```

預期結果：
- ✅ 原子更新測試通過
- ✅ Rate limiting 測試通過（前 10 次成功，第 11 次被拒絕）

---

## 5. 環境變數管理

### 5.1 本地開發環境

建立 `.env.local`（不要提交到 Git）:

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# AI APIs
GEMINI_API_KEY=AIzaSyC...

# 選用
SENTRY_DSN=https://xxx
```

### 5.2 Vercel Production

```bash
# 新增變數
vercel env add VARIABLE_NAME production

# 查看已設定的變數
vercel env ls

# 移除變數
vercel env rm VARIABLE_NAME production

# 拉取遠端變數到本地（開發用）
vercel env pull .env.local
```

---

## 6. 回滾策略

### 6.1 Vercel 快速回滾

```bash
# 1. 查看部署歷史
vercel ls

# 2. 回滾到指定版本
vercel rollback <deployment-url>
```

### 6.2 資料庫回滾

```sql
-- 如果 Migration 有問題，手動撤銷

-- 範例：移除 008_add_rate_limiting.sql
ALTER TABLE profiles DROP COLUMN IF EXISTS last_request_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS request_count_minute;
DROP FUNCTION IF EXISTS check_rate_limit(UUID, INTEGER);
```

⚠️ **警告**: 資料庫回滾需謹慎，可能導致資料遺失。

---

## 7. 監控與日誌

### 7.1 Vercel Logs

```bash
# 即時查看 logs
vercel logs --follow

# 查看特定 function 的 logs
vercel logs api/generate --follow

# 查看錯誤 logs
vercel logs --since 1h | grep ERROR
```

### 7.2 Supabase 監控

在 Supabase Dashboard 查看：

- **Database** → Query Performance - 慢查詢分析
- **Database** → Logs - SQL 錯誤日誌
- **Auth** → Logs - 認證失敗記錄

### 7.3 設定告警（建議）

整合 Sentry 或其他監控服務：

```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})
```

---

## 8. 常見部署問題

### Q1: 環境變數讀取失敗

**症狀**: `GEMINI_API_KEY is not configured`

**解決方案**:
```bash
# 確認變數已設定
vercel env ls

# 重新部署以套用新變數
vercel --prod --force
```

### Q2: API 回應 500 錯誤

**檢查步驟**:
1. 查看 Vercel Logs: `vercel logs api/generate`
2. 確認 Supabase Service Role Key 正確
3. 檢查資料庫 Migrations 是否全部執行

### Q3: RLS 政策導致查詢失敗

**症狀**: `new row violates row-level security policy`

**解決方案**:
```sql
-- 暫時檢查 RLS 政策
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- 確認使用者有正確的權限
SELECT * FROM profiles WHERE id = auth.uid();
```

### Q4: Rate Limiting 不生效

**檢查**:
```sql
-- 確認函數存在
SELECT proname FROM pg_proc WHERE proname = 'check_rate_limit';

-- 確認欄位存在
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'last_request_at';
```

---

## 9. 效能優化建議

### 9.1 前端優化

```bash
# 分析 bundle 大小
npm run build -- --analyze

# 確保圖片已壓縮
# 使用 lazy loading
```

### 9.2 API 優化

```typescript
// 啟用 HTTP 快取（選用）
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
  // ...
}
```

### 9.3 資料庫優化

```sql
-- 新增必要索引
CREATE INDEX IF NOT EXISTS idx_history_user_created
ON history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created
ON usage_logs(user_id, created_at DESC);
```

---

## 10. 安全檢查清單

- [ ] Supabase Service Role Key 僅在後端使用
- [ ] AI API Keys 不暴露於前端
- [ ] RLS 政策已在所有表上啟用
- [ ] CORS 設定正確（僅允許自己的 domain）
- [ ] Rate Limiting 已啟用（10 次/分鐘）
- [ ] 使用者輸入有驗證（防 SQL Injection）
- [ ] HTTPS 已強制啟用

---

## 11. 聯絡與支援

**技術問題**:
- Vercel 支援: https://vercel.com/support
- Supabase 支援: https://supabase.com/support

**緊急問題**:
- 查看 Vercel Status: https://www.vercel-status.com/
- 查看 Supabase Status: https://status.supabase.com/

---

**部署指南完成** ✅
