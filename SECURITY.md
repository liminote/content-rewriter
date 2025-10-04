# Content Rewriter 安全文件

## 文件版本
- **版本**: 1.0
- **更新日期**: 2025-10-04
- **負責人**: 技術團隊

---

## 1. 安全架構總覽

### 1.1 安全層級

```
┌─────────────────────────────────────────────────┐
│            使用者瀏覽器（不信任區域）                │
│  - 不儲存敏感資料                                  │
│  - 不直接調用 AI API                               │
│  - 僅持有 Supabase JWT Token                      │
└─────────────────────────────────────────────────┘
                      ↓ HTTPS Only
┌─────────────────────────────────────────────────┐
│          Vercel Serverless Functions           │
│  ✅ 驗證 JWT Token                               │
│  ✅ 檢查使用者權限（RLS）                          │
│  ✅ Rate Limiting                                │
│  ✅ 輸入驗證                                      │
└─────────────────────────────────────────────────┘
                      ↓
        ┌─────────────┴─────────────┐
        ↓                           ↓
┌──────────────────┐      ┌──────────────────┐
│   Supabase       │      │   AI APIs        │
│  ✅ RLS 政策      │      │  ✅ API Keys 保護 │
│  ✅ 加密儲存      │      │  ✅ 後端調用      │
└──────────────────┘      └──────────────────┘
```

### 1.2 威脅模型

| 威脅類型 | 風險等級 | 防護措施 |
|---------|---------|---------|
| API Key 洩漏 | 🔴 高 | 僅後端使用、環境變數保護 |
| 未授權存取 | 🔴 高 | JWT 驗證、RLS 政策 |
| SQL Injection | 🟡 中 | Supabase Client 參數化查詢 |
| XSS 攻擊 | 🟡 中 | React 自動轉義、Content Security Policy |
| Rate Limit 濫用 | 🟡 中 | 資料庫層級 Rate Limiting |
| CSRF 攻擊 | 🟢 低 | SameSite Cookie、JWT Token |

---

## 2. API Key 保護

### 2.1 環境變數管理

**✅ 正確做法**:

```typescript
// api/generate.ts（後端）
const apiKey = process.env.GEMINI_API_KEY  // ✅ 正確
```

**❌ 絕對禁止**:

```typescript
// src/components/Workspace.tsx（前端）
const apiKey = "AIzaSyC..."  // ❌ 絕對禁止！會洩漏！

// .env.local
VITE_GEMINI_API_KEY=xxx  // ❌ VITE_ 前綴會暴露到前端！
```

### 2.2 Vercel 環境變數設定

```bash
# ✅ 正確：後端專用（不加 VITE_ 前綴）
vercel env add GEMINI_API_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# ✅ 正確：前端可讀（加 VITE_ 前綴）
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production  # 匿名金鑰可暴露（RLS 保護）
```

### 2.3 Git 保護

確保 `.gitignore` 包含：

```gitignore
# 環境變數
.env
.env.local
.env.production
.env.development

# Vercel
.vercel
```

**驗證方式**:

```bash
# 搜尋是否有 API Key 洩漏
git log -p | grep -i "api.key"
git log -p | grep -E "AIza[a-zA-Z0-9_-]{35}"
```

---

## 3. 認證與授權

### 3.1 JWT Token 驗證

**所有 API 端點都必須驗證 Token**:

```typescript
// api/generate.ts
async function authenticateRequest(req: VercelRequest): Promise<AuthenticatedUser> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.replace('Bearer ', '')

  // 驗證 Token
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    throw new Error('Invalid or expired token')
  }

  // 檢查使用者狀態
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile.is_active) {
    throw new Error('Account is disabled')
  }

  // 檢查存取期限（非管理員）
  if (profile.role !== 'admin') {
    const now = new Date()
    const startDate = profile.access_start_date ? new Date(profile.access_start_date) : null
    const endDate = profile.access_end_date ? new Date(profile.access_end_date) : null

    if (startDate && now < startDate) {
      throw new Error('Access not started yet')
    }

    if (endDate && now > endDate) {
      throw new Error('Access expired')
    }
  }

  return profile
}
```

### 3.2 Token 過期處理

前端自動刷新 Token:

```typescript
// lib/supabase.ts
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed successfully')
  }

  if (event === 'SIGNED_OUT') {
    // 清除本地狀態
    useAuthStore.getState().logout()
  }
})
```

---

## 4. Row Level Security (RLS)

### 4.1 RLS 政策概覽

所有業務表都已啟用 RLS，確保使用者只能存取自己的資料。

**profiles 表**:

```sql
-- 使用者只能查看自己的 profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 管理員可以查看所有 profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**templates 表**:

```sql
-- 使用者只能操作自己的模板
CREATE POLICY "Users can view own templates"
  ON templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON templates FOR DELETE
  USING (auth.uid() = user_id);
```

**history 表**:

```sql
-- 使用者只能查看/刪除自己的歷史記錄
CREATE POLICY "Users can view own history"
  ON history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
  ON history FOR DELETE
  USING (auth.uid() = user_id);
```

### 4.2 RLS 繞過（Service Role）

**後端使用 Service Role Key 繞過 RLS（需手動驗證權限）**:

```typescript
// api/generate.ts
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// ⚠️ 使用 Service Role 時，必須手動檢查權限
const { data: templates } = await supabaseAdmin
  .from('templates')
  .select('*')
  .in('id', template_ids)
  .eq('user_id', user.id)  // 👈 手動驗證 user_id

if (!templates || templates.length === 0) {
  return res.status(400).json({ error: 'Invalid template IDs' })
}
```

### 4.3 RLS 測試

```sql
-- 1. 切換到測試使用者
SET request.jwt.claim.sub = '<user_id>';

-- 2. 嘗試查詢其他使用者的資料
SELECT * FROM templates WHERE user_id != '<user_id>';
-- 預期：返回 0 筆資料

-- 3. 查詢自己的資料
SELECT * FROM templates WHERE user_id = '<user_id>';
-- 預期：正常返回資料
```

---

## 5. Rate Limiting

### 5.1 資料庫層級 Rate Limiting

實作於 `008_add_rate_limiting.sql`:

```sql
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
  v_current_minute := date_trunc('minute', NOW());

  SELECT last_request_at, request_count_minute
  INTO v_last_request, v_count
  FROM profiles
  WHERE id = p_user_id;

  -- 如果是新的分鐘，重置計數
  IF v_last_request IS NULL OR date_trunc('minute', v_last_request) < v_current_minute THEN
    v_count := 0;
  END IF;

  v_count := v_count + 1;

  UPDATE profiles
  SET
    last_request_at = NOW(),
    request_count_minute = v_count
  WHERE id = p_user_id;

  RETURN QUERY SELECT
    v_count <= p_max_requests AS allowed,
    v_count AS current_count,
    v_current_minute + INTERVAL '1 minute' AS reset_at;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 API 層級整合

```typescript
// api/generate.ts
const { data: rateLimitResult, error: rateLimitError } = await supabaseAdmin
  .rpc('check_rate_limit', {
    p_user_id: user.id,
    p_max_requests: 10
  })
  .single()

if (rateLimitError) {
  console.error('Rate limit check failed:', rateLimitError)
  // 降級處理：繼續執行
} else if (rateLimitResult && !rateLimitResult.allowed) {
  return res.status(429).json({
    error: 'Too many requests',
    message: `每分鐘最多 10 次請求，請稍後再試`,
    retryAfter: Math.ceil((new Date(rateLimitResult.reset_at).getTime() - Date.now()) / 1000)
  })
}
```

### 5.3 Rate Limit 規則

| 端點 | 限制 | 範圍 |
|-----|------|------|
| `/api/generate` | 10 次/分鐘 | 每位使用者 |
| 其他 API | 無限制（未來可擴充） | - |

---

## 6. 輸入驗證

### 6.1 前端驗證

```typescript
// src/pages/WorkspacePage.tsx
const handleGenerate = async () => {
  // 文章長度驗證
  if (article.length > 3000) {
    toast.error('文章長度超過 3000 字')
    return
  }

  // 模板數量驗證
  if (selectedTemplateIds.length === 0) {
    toast.error('請至少選擇一個模板')
    return
  }

  if (selectedTemplateIds.length > 6) {
    toast.error('一次最多選擇 6 個模板')
    return
  }

  // ...
}
```

### 6.2 後端驗證（防禦性）

```typescript
// api/generate.ts
const { article, template_ids, ai_engine }: GenerateRequest = req.body

// 驗證必要欄位
if (!article || !template_ids || template_ids.length === 0 || !ai_engine) {
  return res.status(400).json({ error: 'Missing required parameters' })
}

// 驗證文章長度
if (article.length > 3000) {
  return res.status(400).json({ error: 'Article too long (max 3000 characters)' })
}

// 驗證模板數量
if (template_ids.length > 6) {
  return res.status(400).json({ error: 'Too many templates selected (max 6)' })
}

// 驗證 AI engine
if (!['gemini', 'claude', 'openai'].includes(ai_engine)) {
  return res.status(400).json({ error: 'Invalid AI engine' })
}

// 驗證 UUID 格式（Supabase 會自動驗證，但可加強）
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
for (const id of template_ids) {
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid template ID format' })
  }
}
```

---

## 7. XSS 防護

### 7.1 React 自動轉義

React 預設會轉義所有輸出，防止 XSS:

```typescript
// ✅ 安全：React 自動轉義
<div>{userInput}</div>

// ❌ 危險：繞過轉義（僅在必要時使用）
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### 7.2 Content Security Policy (CSP)

在 `index.html` 或 Vercel 設定中加入 CSP Header:

```html
<!-- public/index.html -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'unsafe-inline' 'unsafe-eval';
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https:;
               connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com">
```

或在 Vercel 設定:

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'"
        }
      ]
    }
  ]
}
```

---

## 8. 資料加密

### 8.1 傳輸層加密

- ✅ 所有連線強制使用 HTTPS（Vercel 自動配置）
- ✅ Supabase 連線使用 TLS 1.2+

### 8.2 儲存層加密

**Supabase 預設加密**:
- Database: 靜態資料加密（AES-256）
- Backups: 自動加密備份

**敏感欄位處理**:
```sql
-- 密碼已由 Supabase Auth 處理（bcrypt hashing）
-- 其他敏感資料（如 note）可考慮額外加密（未來）
```

---

## 9. 日誌與監控

### 9.1 錯誤日誌

記錄到 `error_logs` 表:

```typescript
// api/generate.ts
try {
  // ...
} catch (error) {
  // 記錄錯誤（不包含敏感資料）
  await supabaseAdmin.from('error_logs').insert({
    user_id: user.id,
    error_type: 'ai_generation_failed',
    error_message: error instanceof Error ? error.message : 'Unknown error',
    context: {
      ai_engine,
      template_count: template_ids.length,
      // ❌ 不記錄：article 內容、API Key
    },
  })

  throw error
}
```

### 9.2 敏感資料排除

**絕對不要記錄**:
- ❌ API Keys
- ❌ JWT Tokens
- ❌ 密碼（即使是錯誤的密碼）
- ❌ 完整的使用者輸入文章（可記錄長度、關鍵字）

### 9.3 日誌保留政策

```sql
-- 定期清理舊日誌（建議每月執行）
DELETE FROM error_logs
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM usage_logs
WHERE created_at < NOW() - INTERVAL '365 days';
```

---

## 10. 資料備份與還原

### 10.1 Supabase 自動備份

- **免費版**: 無自動備份
- **Pro 版**: 每日備份，保留 7 天
- **建議**: 手動定期匯出重要資料

### 10.2 手動備份

```bash
# 使用 Supabase CLI 匯出資料
npx supabase db dump -f backup.sql

# 或在 Supabase Dashboard 下載備份
# Settings → Database → Backups
```

### 10.3 還原策略

```sql
-- 1. 建立新專案（避免直接覆蓋）
-- 2. 執行所有 migrations
-- 3. 匯入備份資料
psql -h <db-host> -U postgres -d postgres -f backup.sql
```

---

## 11. 已知安全限制

### 11.1 目前未實作的安全功能

| 功能 | 風險等級 | 計畫 |
|-----|---------|------|
| Two-Factor Authentication (2FA) | 🟡 中 | 未來版本 |
| IP 白名單（管理員） | 🟡 中 | 未來版本 |
| Session 管理（強制登出） | 🟢 低 | 未來版本 |
| 審計日誌（Audit Log） | 🟢 低 | 未來版本 |

### 11.2 依賴套件風險

```bash
# 定期檢查漏洞
npm audit

# 自動修復
npm audit fix

# 更新套件
npm outdated
npm update
```

---

## 12. 安全檢查清單

### 部署前檢查

- [ ] 所有 API Keys 儲存在環境變數
- [ ] `.env.local` 已加入 `.gitignore`
- [ ] Supabase RLS 已在所有表啟用
- [ ] Rate Limiting 已測試（10 次/分鐘）
- [ ] JWT Token 驗證已在所有 API 實作
- [ ] HTTPS 強制啟用
- [ ] CSP Header 已設定
- [ ] 錯誤訊息不洩漏敏感資訊
- [ ] 資料庫備份已設定

### 定期檢查（每月）

- [ ] 檢查 npm 套件漏洞 (`npm audit`)
- [ ] 檢查 Vercel logs 異常請求
- [ ] 檢查 Supabase Auth logs 異常登入
- [ ] 檢查 error_logs 表異常錯誤
- [ ] 清理舊日誌（90 天前）
- [ ] 驗證 RLS 政策仍正常運作

---

## 13. 緊急應變程序

### 13.1 API Key 洩漏

**步驟**:

1. **立即撤銷舊 Key**
   ```bash
   # 前往 Google Cloud Console / Anthropic / OpenAI
   # 刪除洩漏的 API Key
   ```

2. **產生新 Key**
   ```bash
   # 產生新的 API Key
   ```

3. **更新環境變數**
   ```bash
   vercel env rm GEMINI_API_KEY production
   vercel env add GEMINI_API_KEY production
   vercel --prod --force  # 強制重新部署
   ```

4. **檢查使用量**
   ```bash
   # 檢查 API 使用量是否有異常高峰
   ```

### 13.2 未授權存取

**步驟**:

1. **停用受影響帳號**
   ```sql
   UPDATE profiles
   SET is_active = false
   WHERE id = '<user_id>';
   ```

2. **撤銷所有 Session**
   ```sql
   -- 在 Supabase Dashboard 強制登出
   -- Auth → Users → 選擇使用者 → Sign out user
   ```

3. **檢查異常活動**
   ```sql
   SELECT * FROM usage_logs
   WHERE user_id = '<user_id>'
   ORDER BY created_at DESC
   LIMIT 100;
   ```

### 13.3 DDoS 攻擊

**步驟**:

1. **啟用 Vercel DDoS Protection**（Pro 版功能）

2. **臨時降低 Rate Limit**
   ```sql
   -- 臨時將 rate limit 降到 5 次/分鐘
   UPDATE profiles SET request_count_minute = 0;
   ```

3. **封鎖惡意 IP**（需 Vercel Pro / Enterprise）

---

## 14. 聯絡資訊

**安全問題回報**:
- Email: [待補充]
- 加密通訊: [待補充 PGP Key]

**漏洞賞金計畫**:
- 目前未開放

---

**安全文件完成** ✅
