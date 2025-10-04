# 開發準則與設計規範

## 1. 頁面結構標準化

### 所有受保護的頁面必須遵循以下結構：

```tsx
import { Layout } from '@/components/Layout'

export function SomePage() {
  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-800">頁面標題</h1>
            <p className="mt-2 text-sm text-slate-600">頁面描述</p>
          </div>
        </div>

        {/* 頁面內容 - 使用 space-y-6 自動間距 */}
      </div>
    </Layout>
  )
}
```

**絕對不可變更的部分：**
- `p-6` - 固定 padding
- `max-w-7xl mx-auto` - 固定寬度與置中
- `space-y-6` - 子元素間距（**必須加**，不可漏）
- 標題區塊的 className（**必須一致**）
- ⚠️ **標題容器必須使用 `items-start`，不可使用 `items-center`**（避免右側較高元素導致左側內容位移）

### 使用 PAGE_TEMPLATE.tsx 創建新頁面

**強烈建議**：創建任何新頁面時，直接複製 `PAGE_TEMPLATE.tsx` 的內容作為起點。

步驟：
1. 開啟 `PAGE_TEMPLATE.tsx` 檔案
2. 完整複製其中的結構
3. 修改函數名稱和實際內容
4. ⚠️ **不要修改任何 className**，只修改內容文字

### 檢查清單（每次創建新頁面時）：
- [ ] 是否已從 `PAGE_TEMPLATE.tsx` 複製結構？
- [ ] 是否已導入 `Layout` 組件？
- [ ] 頁面內容是否用 `<Layout>` 包裹？
- [ ] 容器是否包含：`p-6 max-w-7xl mx-auto space-y-6`（**完整拷貝，一個都不能少**）
- [ ] 標題區塊是否使用：`flex items-start justify-between`（**必須是 items-start**）
- [ ] 標題是否使用：`text-3xl font-bold text-indigo-800`
- [ ] 描述是否使用：`mt-2 text-sm text-slate-600`（**順序不可變**）
- [ ] **修改後用 `Read` 工具對比 PAGE_TEMPLATE.tsx 或其他頁面，確認 className 完全一致**

## 2. 設計系統一致性

### 必須參考文件：
1. **DESIGN_SYSTEM.md** - 所有 UI 組件的樣式規範
2. **REQUIREMENTS.md** - 功能需求

### 開發流程：
1. 閱讀需求文件
2. 檢查設計系統文件
3. 複製現有相似頁面作為模板
4. 確保使用相同的設計 token

## 3. 容器與佈局規範

### 頁面層級容器（統一使用）：
```tsx
<Layout>
  <div className="p-6 max-w-7xl mx-auto">
    {/* 所有頁面內容 */}
  </div>
</Layout>
```

### 卡片容器（統一使用）：
```tsx
<div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
  {/* 卡片內容 */}
</div>
```

### 禁止使用：
- ❌ 各頁面自定義不同的 max-width
- ❌ 在頁面組件內重複定義背景漸層
- ❌ 不一致的 padding/margin 值

## 4. 開發前檢查清單

### 創建新頁面前：
1. [ ] 檢查是否有類似頁面可參考
2. [ ] 確認頁面是否需要 Layout（受保護頁面都需要）
3. [ ] 閱讀 DESIGN_SYSTEM.md 確認使用正確的樣式
4. [ ] 規劃頁面結構（header, content, footer）

### 完成頁面後：
1. [ ] 與其他頁面對比，確認一致性
2. [ ] 檢查所有斷點（sm, md, lg, xl）
3. [ ] 確認導航列正常顯示
4. [ ] 確認頁面寬度與其他頁面一致

## 5. 常見錯誤與修正

### 錯誤 1：頁面沒有導航列
**原因**：忘記用 Layout 包裹
```tsx
// ❌ 錯誤
export function MyPage() {
  return <div>內容</div>
}

// ✅ 正確
export function MyPage() {
  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">內容</div>
    </Layout>
  )
}
```

### 錯誤 2：頁面寬度不一致
**原因**：使用了不同的 max-width class
```tsx
// ❌ 錯誤
<div className="max-w-4xl mx-auto">

// ✅ 正確
<div className="max-w-7xl mx-auto">
```

### 錯誤 3：背景色不一致
**原因**：在頁面內重複設定背景
```tsx
// ❌ 錯誤
<div className="min-h-screen bg-gradient-to-br from-blue-50...">

// ✅ 正確 - 背景已在 Layout 中設定
<Layout>
  <div className="p-6">內容</div>
</Layout>
```

## 6. 元件複用原則

### 必須複用的元件：
- Layout（所有受保護頁面）
- 按鈕樣式（參考 DESIGN_SYSTEM.md）
- 輸入框樣式
- 卡片容器

### 複用方法：
1. 從現有頁面複製 className
2. 或創建共用元件（如需要）
3. 保持樣式 token 一致

## 7. Code Review 檢查點

### 提交前自我檢查：
1. **視覺一致性**：
   - 新頁面與現有頁面視覺是否一致？
   - 顏色、圓角、陰影是否符合設計系統？

2. **結構一致性**：
   - 是否使用 Layout？
   - 容器寬度是否一致？
   - Padding/margin 是否統一？

3. **功能完整性**：
   - 導航列是否正常？
   - 響應式是否正常？
   - 所有連結是否可用？

## 8. 測試檢查清單

### 每個頁面完成後必須測試：
- [ ] 導航列顯示正常
- [ ] 頁面寬度與其他頁面一致
- [ ] 所有按鈕使用統一樣式
- [ ] 輸入框使用統一樣式
- [ ] 響應式在不同螢幕尺寸正常
- [ ] 與設計參考網站風格一致

## 9. 重構準則

### 當發現不一致時：
1. 立即停止新開發
2. 記錄所有不一致的地方
3. 統一修正所有頁面
4. 更新文件記錄標準做法

### 避免：
- ❌ 只修改一個頁面
- ❌ 創建多個版本的相同元件
- ❌ 使用不同的 className 達成相同效果

## 10. 資料一致性原則 ⭐ 重要

### 10.1 單一事實來源 (Single Source of Truth)

**核心原則：資料庫 Schema 是唯一的事實來源**

- TypeScript 介面必須與資料庫欄位**完全一致**
- **禁止**在 TypeScript 中使用「別名」(alias) 欄位
- **禁止**在程式碼中使用虛擬欄位或計算欄位（除非明確標註）

### 10.2 範例說明

❌ **錯誤做法**:
```typescript
// ❌ 資料庫只有 usage_count，但 TypeScript 卻定義了別名
export interface UsageQuota {
  usage_count: number      // 實際存在於資料庫
  monthly_usage: number    // ❌ 別名，造成混亂！
}

// ❌ 使用時不知道該用哪個
console.log(quota.usage_count)    // 有值
console.log(quota.monthly_usage)  // undefined！導致 bug
```

✅ **正確做法**:
```typescript
// ✅ 與資料庫欄位完全一致
export interface UsageQuota {
  id: string
  user_id: string
  monthly_limit: number
  current_month: string
  usage_count: number      // 唯一欄位，清晰明確
  updated_at: string
}

// ✅ 使用時清楚明確
console.log(quota.usage_count)  // 永遠有正確的值
```

### 10.3 資料庫欄位對應檢查清單

在修改 TypeScript 介面前，**必須**執行以下步驟：

1. **查看資料庫 Schema**
   ```sql
   -- 在 Supabase SQL Editor 執行
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'your_table_name';
   ```

2. **執行驗證腳本**
   ```bash
   npx tsx scripts/check-db-state.ts
   ```

3. **對照 TypeScript 介面**
   - 確保所有欄位名稱一致
   - 確保資料型別匹配
   - 確保沒有額外的虛擬欄位

### 10.4 常見錯誤與解決方案

**問題 1**: 資料庫欄位改名後，TypeScript 沒有同步更新

**解決方案**:
1. 更新資料庫 Schema (migration)
2. 立即更新 TypeScript 介面
3. 全域搜尋舊欄位名稱，替換為新名稱
4. 執行 `npm run build` 檢查型別錯誤

**問題 2**: 程式碼使用了不存在的欄位

**症狀**:
```typescript
// 程式碼寫 monthly_usage
const count = quota.monthly_usage  // undefined

// 但資料庫實際欄位是 usage_count
```

**解決方案**:
1. 找出所有使用該欄位的地方
2. 替換為正確的資料庫欄位名
3. 移除 TypeScript 介面中的錯誤欄位

### 10.5 資料一致性檢查工具

#### 檢查當前資料庫狀態
```bash
npx tsx scripts/check-db-state.ts
```

輸出範例：
```
📊 Checking database state...

📝 usage_logs:
┌─────────┬──────┬──────────┬────────────────┬───────────────┐
│ (index) │ id   │ ai_engine│ success_count │ input_tokens  │
├─────────┼──────┼──────────┼────────────────┼───────────────┤
│ 0       │ xxx  │ 'gemini' │ 4             │ 1234          │
└─────────┴──────┴──────────┴────────────────┴───────────────┘
```

#### 重置測試數據
```bash
npx tsx scripts/reset-usage.ts
```

### 10.6 最佳實踐總結

✅ **DO (應該做的)**:
- 修改資料庫時，立即更新 TypeScript 介面
- 使用 `check-db-state.ts` 驗證實際資料
- 所有欄位命名使用 `snake_case`（與 PostgreSQL 一致）
- 在 PR 中明確說明資料結構變更

❌ **DON'T (不應該做的)**:
- 在 TypeScript 中定義資料庫不存在的欄位
- 使用別名或計算欄位（除非明確標註 `// virtual field`）
- 假設欄位存在而不驗證
- 在程式碼中硬編碼欄位名稱字串

---

## 11. 文件維護

### 必須更新文件的時機：
- 新增設計 token
- 修改通用元件
- **修改資料庫 Schema** ⭐ 新增
- **修改 API 回傳格式** ⭐ 新增
- 發現新的最佳實踐
- 修正設計不一致問題

### 文件更新流程：
1. 修改程式碼
2. 更新相關的 TypeScript 介面
3. 執行 `check-db-state.ts` 驗證
4. 同步更新 TECHNICAL_DESIGN.md（若涉及架構）
5. 同步更新 DESIGN_SYSTEM.md（若涉及 UI）
6. 更新 CHANGELOG (若是重大變更)
7. 必要時更新 DEVELOPMENT_GUIDELINES.md
8. 通知團隊（或在 commit message 中說明）
