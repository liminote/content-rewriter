# 專案審查報告 - 2025-10-04

## 審查範圍
本次審查涵蓋專案的架構、資料庫設計、API 安全性、前端邏輯、併發處理、以及文件完整性。

---

## 🟢 優點總結

### 1. 資料庫設計
- ✅ Schema 設計合理，正規化良好
- ✅ 完整的 RLS 政策保護所有資料表
- ✅ 索引設計恰當（user_id, created_at 等）
- ✅ 使用 UUID 作為主鍵，避免 ID 衝突
- ✅ ON DELETE CASCADE 設定正確，資料清理邏輯完整

### 2. API 安全性
- ✅ 所有 API 端點都有身份驗證檢查
- ✅ 使用 Service Role Key 繞過 RLS 進行後端操作
- ✅ 完整的錯誤處理機制
- ✅ 敏感資訊（密碼、token）沒有暴露在前端

### 3. 程式碼品質
- ✅ TypeScript 型別定義完整
- ✅ 程式碼結構清晰，模組化良好
- ✅ 前端使用 Zustand 做狀態管理，簡潔易維護
- ✅ UI 設計統一，遵循 DESIGN_SYSTEM.md

### 4. 文件完整性
- ✅ CHANGELOG 詳細記錄變更
- ✅ DATABASE_SCHEMA_UPDATE 文件完整
- ✅ DEVELOPMENT_GUIDELINES 提供清晰的開發準則
- ✅ TECHNICAL_DESIGN 說明系統架構

---

## 🟡 中等優先級問題

### 問題 1: 併發更新 usage_quota 可能導致計數錯誤

**位置**: `api/generate.ts:287-295`

**問題描述**:
多個使用者同時產出時，`usage_quota` 的更新可能產生 race condition。

```typescript
// 目前的做法：讀取 -> 計算 -> 寫入
const quota = await getQuota()  // usage_count = 10
// 此時另一個請求也讀到 usage_count = 10
await updateQuota({ usage_count: quota.usage_count + 4 })  // 更新為 14
// 另一個請求也更新為 14，而不是 18！
```

**影響範圍**:
- 多人同時使用時，配額計算可能不準確
- 可能導致超額使用或誤報配額不足

**建議解決方案**:

方案 A: 使用資料庫的原子操作（推薦）
```sql
UPDATE usage_quota
SET usage_count = usage_count + 4,
    updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING *;
```

方案 B: 使用 PostgreSQL 的樂觀鎖定
```typescript
const { data, error } = await supabaseAdmin
  .from('usage_quota')
  .update({
    usage_count: quota.usage_count + successCount,
    updated_at: now.toISOString()
  })
  .eq('id', quota.id)
  .eq('usage_count', quota.usage_count)  // 確保沒被其他人改過
  .select()
  .single()

if (!data) {
  // 重試邏輯
}
```

**優先級**: 🟡 中等（單人使用不會發生，多人同時使用時才會出現）

---

### 問題 2: history 表缺少 RLS INSERT 政策的 user_id 驗證

**位置**: `supabase/migrations/003_rls_policies.sql:143-146`

**問題描述**:
```sql
CREATE POLICY "Users can insert own history"
  ON public.history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

這個政策是正確的，但是在 `api/generate.ts` 中使用 `supabaseAdmin` 插入時會繞過 RLS。

**影響範圍**:
- 理論上可能插入不屬於使用者的歷史記錄（雖然目前程式碼沒有這樣做）

**建議**:
在 API 層級加入明確檢查：
```typescript
// api/generate.ts:262-275
const { error: historyError } = await supabaseAdmin
  .from('history')
  .insert({
    user_id: user.id,  // ✅ 已經有
    ai_engine,
    outputs: outputs.map(o => ({
      template_id: o.template_id,
      template_name: o.template_name,
      content: o.content,
      status: o.status,
      error_message: o.error_message,
    })),
    created_at: generatedAt,
  })

// 建議加上檢查
if (historyError) {
  // 記錄到 error_logs
  await supabaseAdmin.from('error_logs').insert({
    user_id: user.id,
    error_type: 'HISTORY_INSERT_FAILED',
    error_message: historyError.message,
    context: { ai_engine, template_count: template_ids.length }
  })
}
```

**優先級**: 🟡 中等（目前程式碼沒有問題，但缺少防禦性檢查）

---

### 問題 3: usage_quota 的月份計算沒有考慮時區

**位置**: `api/generate.ts:172-192`

**問題描述**:
```typescript
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
```

使用 `new Date()` 會受到伺服器時區影響。如果伺服器在 UTC+0，但使用者在 UTC+8，可能導致月份判斷錯誤。

**範例**:
- 伺服器時間：2025-10-31 23:00 (UTC)
- 台灣時間：2025-11-01 07:00 (UTC+8)
- 使用者認為是 11 月，但系統計算為 10 月

**建議解決方案**:
統一使用 UTC 時間，並在前端顯示時轉換為使用者時區。

```typescript
const currentMonth = now.toISOString().substring(0, 7)  // "2025-10"
```

**優先級**: 🟡 中等（目前使用者都在同一時區，未來跨時區使用時會出現問題）

---

### 問題 4: SettingsPage 更新 profile 後狀態同步問題

**位置**: `src/pages/SettingsPage.tsx:48-52`

**問題描述**:
```typescript
if (updatedProfile) {
  useAuthStore.setState({ profile: updatedProfile })
}
```

直接使用 `setState` 更新 Zustand store，但沒有型別檢查。

**建議**:
使用 store 提供的方法來更新：
```typescript
// src/store/authStore.ts 新增方法
updateProfile: (profile: Profile) => set({ profile })

// SettingsPage.tsx 中使用
const { updateProfile } = useAuthStore()
if (updatedProfile) {
  updateProfile(updatedProfile)
}
```

**優先級**: 🟡 中等（功能正常，但不符合最佳實踐）

---

## 🔴 高優先級問題

### 問題 5: API 配額檢查在取得模板之前，但模板可能不存在

**位置**: `api/generate.ts:202-222`

**問題描述**:
目前流程：
1. 檢查配額（第 202 行）
2. 取得模板（第 214 行）
3. 產出內容

但如果使用者傳入不存在的 template_ids，會在步驟 2 失敗，但配額已經檢查過了，給使用者錯誤的訊息。

**範例場景**:
```
使用者配額：98/100
使用者選擇 5 個模板（其中 2 個已被刪除）

當前行為：
1. 檢查配額：98 + 5 = 103 > 100 ❌ 拒絕（錯誤）
2. 實際上只有 3 個模板有效，98 + 3 = 101 > 100 ❌ 仍然拒絕

正確行為應該是：
1. 先檢查模板是否存在
2. 再檢查配額
```

**建議解決方案**:
調整順序，先驗證模板，再檢查配額：

```typescript
// 4. 取得模板資訊（移到配額檢查之前）
const { data: templates, error: templatesError } = await supabaseAdmin
  .from('templates')
  .select('*')
  .in('id', template_ids)
  .eq('user_id', user.id)

if (templatesError || !templates || templates.length === 0) {
  return res.status(400).json({ error: 'Invalid template IDs' })
}

// 5. 檢查配額限制（使用實際模板數量）
if (quota.usage_count + templates.length > quota.monthly_limit) {
  return res.status(429).json({
    error: 'Monthly quota exceeded',
    usage: {
      current: quota.usage_count,
      limit: quota.monthly_limit,
    },
  })
}
```

**優先級**: 🔴 高（會影響使用者體驗）

---

### 問題 6: 缺少 API rate limiting

**位置**: 所有 API 端點

**問題描述**:
目前沒有實作 rate limiting，惡意使用者可以：
- 短時間內大量呼叫 API
- 造成 AI API 費用暴增
- 導致其他使用者服務變慢

**建議解決方案**:

方案 A: 使用 Vercel Edge Config + KV
```typescript
import { kv } from '@vercel/kv'

const rateLimitKey = `rate_limit:${user.id}:${Date.now() / 60000 | 0}`
const count = await kv.incr(rateLimitKey)
await kv.expire(rateLimitKey, 60)

if (count > 10) {  // 每分鐘最多 10 次
  return res.status(429).json({ error: 'Too many requests' })
}
```

方案 B: 在資料庫中記錄最近請求時間
```sql
ALTER TABLE profiles ADD COLUMN last_request_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN request_count_this_minute INTEGER DEFAULT 0;
```

**優先級**: 🔴 高（多人使用時可能被濫用）

---

## 🔵 低優先級問題 / 建議改進

### 問題 7: 歷史記錄沒有分頁，可能影響效能

**位置**: `src/store/historyStore.ts:35`

**當前實作**:
```typescript
.limit(100)
```

**建議**:
1. 實作分頁或無限滾動
2. 或使用虛擬滾動（react-window）

**優先級**: 🔵 低（目前 100 筆限制夠用）

---

### 問題 8: error_logs 沒有定期清理機制

**位置**: 資料庫設計

**問題**:
error_logs 會持續累積，沒有清理機制。

**建議**:
建立定期清理的 cron job 或使用 Supabase 的 pg_cron：

```sql
-- 保留最近 30 天的錯誤日誌
DELETE FROM error_logs
WHERE created_at < NOW() - INTERVAL '30 days';
```

**優先級**: 🔵 低（短期不會有問題）

---

### 問題 9: 缺少監控與告警機制

**建議新增**:
1. **錯誤率監控**: 當錯誤率超過 5% 時發送告警
2. **配額使用監控**: 當使用者接近配額上限時通知
3. **API 回應時間監控**: Gemini API 回應時間異常時告警
4. **Token 使用量監控**: 每日 token 使用量異常時告警

**實作方式**:
- 使用 Vercel Analytics
- 或整合 Sentry
- 或使用 Supabase 的 Webhooks

**優先級**: 🔵 低（開發階段不需要，生產環境建議加上）

---

## 📋 文件更新建議

### 建議 1: 更新 TECHNICAL_DESIGN.md

**需要補充的章節**:

1. **併發處理策略**
   - usage_quota 更新的原子性保證
   - 多個請求同時處理的機制

2. **錯誤處理流程**
   - API 錯誤的分類（4xx, 5xx）
   - 前端如何處理不同類型的錯誤
   - error_logs 的記錄策略

3. **配額計算邏輯**
   - 月份的定義（UTC 時間）
   - 配額重置的時機
   - 失敗的請求是否計入配額

### 建議 2: 新增 DEPLOYMENT.md

**應包含**:
- 環境變數設定清單
- Vercel 部署步驟
- Supabase 設定步驟
- Migration 執行順序
- 初始管理員帳號建立方式

### 建議 3: 新增 SECURITY.md

**應包含**:
- RLS 政策說明
- API 金鑰管理
- 使用者權限控制
- 資料備份策略
- 已知安全限制

---

## 🎯 立即行動項目（按優先級排序）

### Phase 1: 高優先級修復（建議 1-2 天內完成）

1. ✅ **修復 API 配額檢查順序**
   - 調整 api/generate.ts 的檢查順序
   - 先驗證模板，再檢查配額

2. ✅ **實作 usage_quota 原子更新**
   - 使用 SQL 的原子操作更新配額
   - 避免併發更新導致計數錯誤

3. ✅ **加入基本的 rate limiting**
   - 每個使用者每分鐘最多 10 次請求
   - 使用簡單的資料庫計數或 KV store

### Phase 2: 中等優先級改進（建議 1 週內完成）

4. ✅ **修復時區問題**
   - 統一使用 UTC 時間計算月份
   - 前端顯示時轉換為使用者時區

5. ✅ **加強錯誤處理**
   - history 插入失敗時記錄到 error_logs
   - API 層級加入更多防禦性檢查

6. ✅ **更新文件**
   - 補充 TECHNICAL_DESIGN.md
   - 新增 DEPLOYMENT.md
   - 新增 SECURITY.md

### Phase 3: 低優先級優化（建議 2-4 週內完成）

7. ✅ **實作歷史記錄分頁**
   - 前端改用無限滾動或分頁
   - 每次載入 20 筆

8. ✅ **建立定期清理機制**
   - error_logs 保留 30 天
   - 舊的 history 可選擇性刪除

9. ✅ **加入監控告警**
   - 整合 Sentry 或 Vercel Analytics
   - 設定關鍵指標的告警

---

## ✅ 做得很好的部分

1. **資料一致性原則**:
   - Database schema as single source of truth
   - 完整記錄在 DEVELOPMENT_GUIDELINES.md

2. **Token 追蹤**:
   - 準確記錄 input/output tokens
   - 為未來成本分析打好基礎

3. **使用量計算邏輯**:
   - 按成功模板數計算，公平合理
   - 詳細記錄在 CHANGELOG

4. **UI/UX 一致性**:
   - 遵循 PAGE_TEMPLATE.tsx
   - 所有頁面風格統一

5. **Migration 管理**:
   - 按序號命名，清晰易懂
   - 每個 migration 都有註解說明

---

## 總結

**整體評價**: 🟢 良好

專案架構合理、程式碼品質良好、文件完整。大部分的問題都是在多人同時使用時才會出現的邊界情況。

**關鍵建議**:
1. **優先處理併發問題**（usage_quota 原子更新）
2. **加入 rate limiting**（防止濫用）
3. **統一時區處理**（避免月份計算錯誤）

完成以上三項後，系統可以安全地供多人使用。

---

**審查人**: Claude (AI Assistant)
**審查日期**: 2025-10-04
**專案版本**: 基於 2025-10-04 的程式碼狀態
