# 系統更新紀錄 - 2025-10-04

## 重大更新

### 1. AI 引擎與 Token 追蹤

#### 1.1 更新 Gemini 模型
- **變更前**: `gemini-pro` (舊版，已被棄用)
- **變更後**: `gemini-2.5-flash` (最新穩定版)
- **影響**: 更快的回應速度、更準確的產出
- **文件位置**: `api/generate.ts:118`

#### 1.2 新增 Token 使用追蹤
**資料庫變更**:
```sql
ALTER TABLE public.usage_logs
ADD COLUMN input_tokens INTEGER DEFAULT 0,
ADD COLUMN output_tokens INTEGER DEFAULT 0,
ADD COLUMN total_tokens INTEGER DEFAULT 0;
```

**TypeScript 型別更新**:
```typescript
// src/types/index.ts
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

**API 回傳更新**:
- Gemini API 現在會回傳 `usageMetadata`
- 包含 `promptTokenCount` (input) 和 `candidatesTokenCount` (output)
- 每次 API 調用都會記錄實際 token 消耗

**文件位置**:
- `api/generate.ts:111-137` - Gemini provider
- `api/generate.ts:227-240` - Token 累加邏輯
- `api/generate.ts:310-312` - 儲存到 usage_logs

---

### 2. 使用量計算邏輯重大調整

#### 2.1 從「按請求計算」改為「按成功模板計算」

**變更前 (錯誤)**:
```typescript
// 無論使用幾個模板，都只計算 1 次
usage_count: quota.usage_count + 1
```

**變更後 (正確)**:
```typescript
// 統計成功產出的模板數量
const successCount = outputs.filter(o => o.status === 'success').length

// 按成功模板數計算使用量
usage_count: quota.usage_count + successCount
```

**實際案例**:
- **情境**: 使用者一次選擇 4 個模板產出
- **舊邏輯**: 計算為使用 1 次（不公平）
- **新邏輯**: 計算為使用 4 次（公平計費）

**影響範圍**:
- ✅ 工作區顯示的使用次數
- ✅ 系統監控的產出統計
- ✅ 本月使用排行 TOP 10
- ✅ AI 引擎使用統計

**文件位置**: `api/generate.ts:277-285`

---

#### 2.2 監控儀表板統計邏輯修正

**問題**: 監控頁面的統計是「計算筆數」，應該要「加總 success_count」

**變更前 (錯誤)**:
```typescript
// 只計算 usage_logs 的筆數
const todayGenerations = todayLogs?.length || 0

const geminiCount = monthLogs?.filter(log => log.ai_engine === 'gemini').length || 0
```

**變更後 (正確)**:
```typescript
// 加總 success_count
const todayGenerations = todayLogs?.reduce((sum, log) => sum + (log.success_count || 0), 0) || 0

const geminiCount = monthLogs
  ?.filter(log => log.ai_engine === 'gemini')
  .reduce((sum, log) => sum + (log.success_count || 0), 0) || 0
```

**文件位置**: `src/store/adminDashboardStore.ts:133-142`

---

### 3. 監控頁面 UI 更新

#### 3.1 移除「AI 費用預估」卡片

**原因**:
- 目前使用 Google Gemini **免費 API**
- 顯示假的費用數字（$0.5/次）誤導使用者
- 不符合實際使用狀況

**變更前**:
```tsx
<h2>本月 AI 費用預估</h2>
<div>
  <span>Gemini</span>
  <span>$4.00</span>  {/* 假數據 */}
</div>
```

**變更後**:
```tsx
<h2>本月 Token 使用統計</h2>
<div>
  <span>Gemini</span>
  <span>12,345 tokens</span>  {/* 真實數據 */}
</div>
<p>✨ 目前使用免費 API，無需付費</p>
```

**顯示內容**:
- 各 AI 引擎的 input tokens 和 output tokens
- 總 token 使用量
- 明確標示「免費 API，無需付費」

**文件位置**: `src/pages/admin/AdminDashboard.tsx:143-201`

---

### 4. 資料一致性修正

#### 4.1 資料庫欄位名稱標準化

**問題**: TypeScript 和資料庫欄位名稱不一致

**資料庫實際欄位**:
```sql
CREATE TABLE usage_quota (
  usage_count INTEGER NOT NULL DEFAULT 0
);
```

**TypeScript 介面 (錯誤)**:
```typescript
export interface UsageQuota {
  usage_count: number
  monthly_usage: number  // ❌ 資料庫沒有這個欄位！別名造成混亂
}
```

**修正後 (正確)**:
```typescript
export interface UsageQuota {
  usage_count: number  // ✅ 與資料庫一致
}
```

**影響檔案**:
- `src/types/index.ts` - 移除 `monthly_usage` 別名
- `src/store/usageStore.ts` - 統一使用 `usage_count`
- `src/pages/WorkspacePage.tsx` - 統一使用 `usage_count`
- `api/generate.ts` - 統一使用 `usage_count`

**原則**: **Database schema is the single source of truth**

---

### 5. UI/UX 改進

#### 5.1 工作區產出結果可編輯

**新增功能**:
- 產出結果的 textarea 現在可以編輯
- 自動調整高度（無 scrollbar）
- 複製按鈕會複製編輯後的內容
- 字數統計會即時更新

**文件位置**: `src/pages/WorkspacePage.tsx:292-327`

#### 5.2 字數統計與複製按鈕位置調整

**變更**:
- 字數統計從頂部移到底部
- 複製按鈕從頂部移到底部
- 與輸入框的字數統計位置一致

**原因**: 更符合使用者閱讀習慣

---

## 技術文件更新需求

### TECHNICAL_DESIGN.md

需要更新以下章節:

**第 3.1 節 - 資料庫 Schema**:
```sql
-- ✏️ 需要補充
CREATE TABLE usage_logs (
  -- ... 其他欄位
  input_tokens INTEGER DEFAULT 0,    -- 新增
  output_tokens INTEGER DEFAULT 0,   -- 新增
  total_tokens INTEGER DEFAULT 0,    -- 新增
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**第 2.2 節 - POST /api/generate 流程**:
```
✏️ 步驟 6 需要更新：
6. 更新 usage_quota.usage_count + successCount  (不是 +1)
```

**第 4.1 節 - AI Provider 介面**:
```typescript
// ✏️ 需要更新回傳型別
export interface AIProvider {
  name: 'gemini' | 'claude' | 'openai';
  generateContent(prompt: string, article: string): Promise<{
    text: string;
    inputTokens: number;
    outputTokens: number;
  }>;
}
```

**第 4.1 節 - Gemini Implementation**:
```typescript
// ✏️ 需要更新模型名稱
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

// ✏️ 需要新增 token 追蹤
const usageMetadata = response.usageMetadata
return {
  text,
  inputTokens: usageMetadata?.promptTokenCount || 0,
  outputTokens: usageMetadata?.candidatesTokenCount || 0,
}
```

---

### DEVELOPMENT_GUIDELINES.md

需要新增章節:

**資料一致性原則**:
```markdown
## 資料一致性原則

### 單一事實來源 (Single Source of Truth)
- 資料庫 schema 是唯一的事實來源
- TypeScript 介面必須與資料庫欄位完全一致
- 禁止在 TypeScript 中使用「別名」(alias) 欄位

### 範例
❌ **錯誤做法**:
```typescript
export interface UsageQuota {
  usage_count: number
  monthly_usage: number  // 別名，造成混亂
}
```

✅ **正確做法**:
```typescript
export interface UsageQuota {
  usage_count: number  // 與資料庫欄位一致
}
```

### 檢查清單
- [ ] 確認 TypeScript 介面與 Supabase schema 一致
- [ ] 使用 `npx tsx scripts/check-db-state.ts` 驗證資料
- [ ] 確保所有程式碼使用相同的欄位名稱
```

---

## 資料庫遷移記錄

### Migration 005: Reset Usage Data
- **檔案**: `supabase/migrations/005_reset_usage_data.sql`
- **用途**: 清空測試數據
- **內容**: 重置 usage_quota、清空 usage_logs 和 history

### Migration 006: Add Token Usage Tracking
- **檔案**: `supabase/migrations/006_add_token_usage.sql`
- **用途**: 新增 token 追蹤欄位
- **執行日期**: 2025-10-04
- **SQL**:
```sql
ALTER TABLE public.usage_logs
ADD COLUMN input_tokens INTEGER DEFAULT 0,
ADD COLUMN output_tokens INTEGER DEFAULT 0,
ADD COLUMN total_tokens INTEGER DEFAULT 0;
```

---

## 測試與驗證

### 已驗證項目
- ✅ Gemini API 使用 `gemini-2.5-flash` 成功產出
- ✅ Token 使用量正確記錄到資料庫
- ✅ 使用量按成功模板數計算（4 個模板 = 4 次）
- ✅ 監控頁面顯示真實 token 數據
- ✅ 工作區產出結果可編輯
- ✅ 資料庫欄位名稱一致性

### 驗證腳本
```bash
# 檢查資料庫狀態
npx tsx scripts/check-db-state.ts

# 重置使用數據
npx tsx scripts/reset-usage.ts

# 檢查 token 欄位是否存在
npx tsx scripts/add-token-columns.ts
```

---

## 效能影響

### Token 追蹤
- **額外儲存**: 每筆 usage_logs 增加 3 個 INTEGER 欄位（12 bytes）
- **查詢效能**: 無影響（已有索引）
- **API 回應時間**: 無影響（token 資料來自 AI API response）

### 統計計算
- **變更前**: 簡單計數（COUNT）
- **變更後**: 加總計算（SUM）
- **效能影響**: 微乎其微（< 1ms 差異）

---

## Git Commits

### 相關 Commits
1. `db13914` - Fix monitoring dashboard statistics to sum success_count
2. `5020739` - Add token usage tracking and replace cost estimation
3. `936dfe3` - Fix TypeScript errors in AdminDashboard

### Commit 摘要
- 修正監控儀表板統計邏輯
- 新增 token 使用追蹤
- 移除假的費用預估，改為真實 token 統計
- 資料庫欄位名稱標準化
- 使用量計算改為按成功模板數

---

## 未來建議

### 短期 (1 週內)
- [ ] 監控 Gemini API token 使用量趨勢
- [ ] 設定 token 使用量告警（超過免費額度）
- [ ] 測試多次產出後的統計準確性

### 中期 (1 個月內)
- [ ] 根據 token 使用量估算付費 API 成本
- [ ] 實作 token 使用量視覺化圖表
- [ ] 支援其他 AI 引擎的 token 追蹤

### 長期
- [ ] 自動根據 token 使用量推薦最經濟的 AI 引擎
- [ ] 實作 token 配額管理（除了產出次數）
- [ ] 支援自訂 token 限制

---

## 重要提醒

### 資料一致性
⚠️ **永遠以資料庫 schema 為準**
- 修改 TypeScript 介面前，先確認資料庫欄位
- 使用 `check-db-state.ts` 驗證實際資料
- 不要在程式碼中使用別名或虛擬欄位

### Token 追蹤
✅ **Gemini API 免費額度**
- Flash 2.5 模型目前免費
- 需監控使用量，避免未來收費時措手不及
- Token 統計為未來成本分析打好基礎

### 使用量計算
✅ **公平計費原則**
- 1 次請求使用 N 個模板 = 計算 N 次
- 失敗的模板不計入使用量
- 確保使用者與系統雙贏

---

**文件版本**: 1.0
**更新日期**: 2025-10-04
**作者**: Claude (基於實際程式碼變更)
