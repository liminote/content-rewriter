# 資料庫 Schema 更新 - 2025-10-04

## 摘要
本次更新為 `usage_logs` 表新增 token 使用量追蹤欄位，以支援精確的 API 使用量監控和成本分析。

---

## Migration 檔案

### 檔案位置
`supabase/migrations/006_add_token_usage.sql`

### SQL 內容
```sql
-- ============================================
-- Add token usage tracking
-- ============================================

-- Add token usage columns to usage_logs
ALTER TABLE public.usage_logs
ADD COLUMN input_tokens INTEGER DEFAULT 0,
ADD COLUMN output_tokens INTEGER DEFAULT 0,
ADD COLUMN total_tokens INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.usage_logs.input_tokens IS 'Number of input tokens used';
COMMENT ON COLUMN public.usage_logs.output_tokens IS 'Number of output tokens used';
COMMENT ON COLUMN public.usage_logs.total_tokens IS 'Total tokens used (input + output)';
```

### 執行狀態
✅ **已執行** (2025-10-04)

---

## 變更前後對照

### 變更前 Schema

```sql
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ai_engine TEXT NOT NULL,
  template_count INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 變更後 Schema

```sql
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ai_engine TEXT NOT NULL,
  template_count INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  input_tokens INTEGER DEFAULT 0,      -- 新增
  output_tokens INTEGER DEFAULT 0,     -- 新增
  total_tokens INTEGER DEFAULT 0,      -- 新增
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 新增欄位說明

### `input_tokens` (INTEGER)
- **用途**: 記錄 AI API 調用時使用的輸入 token 數量
- **來源**: AI API response 的 `usageMetadata.promptTokenCount`
- **預設值**: 0
- **範例**:
  - 輸入文章 500 字 + prompt 100 字 → 約 600 tokens

### `output_tokens` (INTEGER)
- **用途**: 記錄 AI API 回傳的輸出 token 數量
- **來源**: AI API response 的 `usageMetadata.candidatesTokenCount`
- **預設值**: 0
- **範例**:
  - 產出內容 200 字 → 約 200 tokens

### `total_tokens` (INTEGER)
- **用途**: 總 token 使用量 (input + output)
- **計算方式**: `input_tokens + output_tokens`
- **預設值**: 0
- **範例**:
  - input: 600, output: 200 → total: 800

---

## TypeScript 型別更新

### 檔案位置
`src/types/index.ts`

### 更新內容

**變更前**:
```typescript
export interface UsageLog {
  id: string
  user_id: string
  ai_engine: AIEngine
  template_count: number
  success_count: number
  error_count: number
  created_at: string
}
```

**變更後**:
```typescript
export interface UsageLog {
  id: string
  user_id: string
  ai_engine: AIEngine
  template_count: number
  success_count: number
  error_count: number
  input_tokens: number      // 新增
  output_tokens: number     // 新增
  total_tokens: number      // 新增
  created_at: string
}
```

---

## API 變更

### 檔案: `api/generate.ts`

#### 1. Gemini Provider 回傳型別更新

**變更前**:
```typescript
async function generateWithGemini(prompt: string, article: string): Promise<string> {
  // ...
  return text
}
```

**變更後**:
```typescript
async function generateWithGemini(
  prompt: string,
  article: string
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  // ...
  const usageMetadata = response.usageMetadata
  const inputTokens = usageMetadata?.promptTokenCount || 0
  const outputTokens = usageMetadata?.candidatesTokenCount || 0

  return { text, inputTokens, outputTokens }
}
```

#### 2. 主要 handler Token 累加邏輯

**新增程式碼** (api/generate.ts:227-240):
```typescript
// 5. 依序產出各模板內容
const outputs: GenerateOutput[] = []
const generatedAt = now.toISOString()
let totalInputTokens = 0      // 新增
let totalOutputTokens = 0     // 新增

for (const template of templates) {
  try {
    const result = await generateContent({
      prompt: template.prompt,
      article,
      engine: ai_engine,
    })

    // 累加 token
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens

    outputs.push({
      template_id: template.id,
      template_name: template.name,
      content: result.text,  // 變更：從 content 改為 result.text
      status: 'success',
      generated_at: generatedAt,
    })
  } catch (error) {
    // ... 錯誤處理
  }
}
```

#### 3. 儲存到 usage_logs

**新增程式碼** (api/generate.ts:310-314):
```typescript
await supabaseAdmin
  .from('usage_logs')
  .insert({
    user_id: user.id,
    ai_engine,
    template_count: template_ids.length,
    success_count: successCount,
    error_count: errorCount,
    input_tokens: totalInputTokens,     // 新增
    output_tokens: totalOutputTokens,   // 新增
    total_tokens: totalInputTokens + totalOutputTokens,  // 新增
    created_at: generatedAt,
  })
```

---

## 前端變更

### 檔案: `src/store/adminDashboardStore.ts`

#### 1. Dashboard Stats 介面更新

**變更前**:
```typescript
export interface DashboardStats {
  // ... 其他欄位
  estimatedCost: {
    gemini: number
    claude: number
    openai: number
    total: number
  }
}
```

**變更後**:
```typescript
export interface DashboardStats {
  // ... 其他欄位
  tokenUsage: {
    gemini: { input: number; output: number; total: number }
    claude: { input: number; output: number; total: number }
    openai: { input: number; output: number; total: number }
    total: { input: number; output: number; total: number }
  }
}
```

#### 2. 查詢更新 (包含 token 欄位)

**變更前**:
```typescript
const { data: monthLogs } = await supabase
  .from('usage_logs')
  .select('ai_engine, success_count')
  .gte('created_at', monthStart.toISOString())
```

**變更後**:
```typescript
const { data: monthLogs } = await supabase
  .from('usage_logs')
  .select('ai_engine, success_count, input_tokens, output_tokens, total_tokens')
  .gte('created_at', monthStart.toISOString())
```

#### 3. Token 統計計算

**新增程式碼** (src/store/adminDashboardStore.ts:161-182):
```typescript
const tokenUsage = {
  gemini: {
    input: monthLogs?.filter((log) => log.ai_engine === 'gemini')
      .reduce((sum, log) => sum + (log.input_tokens || 0), 0) || 0,
    output: monthLogs?.filter((log) => log.ai_engine === 'gemini')
      .reduce((sum, log) => sum + (log.output_tokens || 0), 0) || 0,
    total: monthLogs?.filter((log) => log.ai_engine === 'gemini')
      .reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0,
  },
  // ... claude, openai 類似
  total: {
    input: monthLogs?.reduce((sum, log) => sum + (log.input_tokens || 0), 0) || 0,
    output: monthLogs?.reduce((sum, log) => sum + (log.output_tokens || 0), 0) || 0,
    total: monthLogs?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0,
  },
}
```

---

## 監控頁面 UI 更新

### 檔案: `src/pages/admin/AdminDashboard.tsx`

#### 變更摘要
- 移除「本月 AI 費用預估」卡片
- 新增「本月 Token 使用統計」卡片
- 顯示實際 token 消耗（而非假的費用）

#### UI 範例

**新版顯示**:
```
┌──────────────────────────────────┐
│ 本月 Token 使用統計             │
├──────────────────────────────────┤
│ Gemini          12,345 tokens    │
│  輸入: 8,000    輸出: 4,345      │
├──────────────────────────────────┤
│ 總計            12,345 tokens    │
├──────────────────────────────────┤
│ ✨ 目前使用免費 API，無需付費    │
└──────────────────────────────────┘
```

---

## 資料查詢範例

### SQL 查詢當月 token 使用量

```sql
-- 查詢當月所有 token 使用量
SELECT
  ai_engine,
  SUM(input_tokens) as total_input,
  SUM(output_tokens) as total_output,
  SUM(total_tokens) as total_all
FROM usage_logs
WHERE created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY ai_engine;
```

### SQL 查詢特定使用者的 token 使用量

```sql
-- 查詢特定使用者的 token 使用量
SELECT
  user_id,
  ai_engine,
  created_at,
  success_count,
  input_tokens,
  output_tokens,
  total_tokens
FROM usage_logs
WHERE user_id = 'xxx-xxx-xxx'
ORDER BY created_at DESC
LIMIT 10;
```

### TypeScript 查詢範例

```typescript
// 查詢當月 Gemini token 使用量
const { data } = await supabase
  .from('usage_logs')
  .select('input_tokens, output_tokens, total_tokens')
  .eq('ai_engine', 'gemini')
  .gte('created_at', new Date(2025, 9, 1).toISOString())

const totalTokens = data?.reduce((sum, log) => sum + log.total_tokens, 0) || 0
console.log(`Gemini 本月使用: ${totalTokens} tokens`)
```

---

## 驗證與測試

### 1. 資料庫欄位檢查

```bash
# 執行檢查腳本
npx tsx scripts/check-db-state.ts
```

**預期輸出**:
```
📊 Checking database state...

📝 usage_logs:
┌─────────┬────────┬───────────┬────────────────┬───────────────┬────────────────┬─────────────┐
│ (index) │ id     │ ai_engine │ success_count  │ input_tokens  │ output_tokens  │ total_tokens│
├─────────┼────────┼───────────┼────────────────┼───────────────┼────────────────┼─────────────┤
│ 0       │ xxx... │ 'gemini'  │ 4              │ 2400          │ 800            │ 3200        │
└─────────┴────────┴───────────┴────────────────┴───────────────┴────────────────┴─────────────┘
```

### 2. 功能測試步驟

1. **產出內容**
   - 登入系統
   - 選擇 4 個模板
   - 點擊「產出」

2. **檢查資料庫**
   ```bash
   npx tsx scripts/check-db-state.ts
   ```

3. **驗證監控頁面**
   - 打開系統監控頁面
   - 檢查「本月 Token 使用統計」
   - 確認數字正確顯示

4. **預期結果**
   - `usage_logs` 表有 1 筆新記錄
   - `success_count` = 4
   - `input_tokens` > 0
   - `output_tokens` > 0
   - `total_tokens` = input_tokens + output_tokens

---

## 向後相容性

### 現有資料
✅ **完全相容**
- 所有現有記錄的 `input_tokens`, `output_tokens`, `total_tokens` 預設為 0
- 不影響現有查詢
- 歷史資料可正常讀取

### API 相容性
✅ **完全相容**
- 前端不需要更新即可運作
- 新欄位為可選，不會導致錯誤

---

## 回滾方案

如需回滾此變更：

```sql
-- 移除新增的欄位
ALTER TABLE public.usage_logs
DROP COLUMN input_tokens,
DROP COLUMN output_tokens,
DROP COLUMN total_tokens;
```

⚠️ **注意**: 回滾會永久刪除這些欄位的資料，無法復原。

---

## 相關文件

- [CHANGELOG_2025-10-04.md](./CHANGELOG_2025-10-04.md) - 完整變更記錄
- [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) - 技術設計文件
- [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) - 開發準則

---

**文件版本**: 1.0
**更新日期**: 2025-10-04
**維護者**: Claude (基於實際 Schema 變更)
