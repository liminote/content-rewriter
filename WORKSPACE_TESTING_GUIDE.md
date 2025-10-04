# 🧪 工作區測試指南

## ✅ 已完成的功能

### 1. 認證系統
- ✅ 登入/登出
- ✅ 忘記密碼
- ✅ 邀請制註冊
- ✅ 使用期限檢查
- ✅ 路由保護

### 2. 工作區核心功能
- ✅ Layout 導航列
- ✅ 文章輸入區域
- ✅ AI 引擎選擇（Gemini/Claude/OpenAI）
- ✅ 模板勾選功能
- ✅ 使用量顯示（本月已使用 X / Y 次）
- ✅ AI 產出功能（整合 Gemini API）
- ✅ 產出結果顯示
- ✅ 複製功能
- ✅ 倒數計時（60秒防抖）
- ✅ Loading 狀態
- ✅ 錯誤處理

### 3. API 端點
- ✅ POST /api/generate - AI 產出
  - 認證驗證
  - 使用量配額檢查
  - 自動月份重置
  - 依序產出多個模板
  - 儲存歷史記錄
  - 更新使用量

---

## 🧪 測試步驟

### 前置準備

1. **確認資料庫已設定**
   - 執行過所有 migration 檔案
   - 有預設模板（3 個）

2. **建立測試使用者**

   在 Supabase SQL Editor 執行：

   ```sql
   -- 先在 Authentication > Users 建立使用者
   -- Email: test@example.com
   -- Password: test123

   -- 設定使用期限
   UPDATE public.profiles
   SET
     role = 'user',
     name = '測試使用者',
     is_active = true,
     access_start_date = NOW(),
     access_end_date = NOW() + INTERVAL '30 days'
   WHERE email = 'test@example.com';

   -- 確認 usage_quota 已建立（由 trigger 自動建立）
   SELECT * FROM public.usage_quota WHERE user_id = (
     SELECT id FROM public.profiles WHERE email = 'test@example.com'
   );

   -- 確認 templates 已複製（由 trigger 自動建立）
   SELECT * FROM public.templates WHERE user_id = (
     SELECT id FROM public.profiles WHERE email = 'test@example.com'
   );
   ```

3. **啟動開發伺服器**
   ```bash
   npm run dev
   ```
   前往 http://localhost:3000

---

### 測試 1: 登入流程

1. 訪問 http://localhost:3000
2. 輸入測試帳號：
   - Email: test@example.com
   - Password: test123
3. **預期結果**：
   - ✅ 成功登入
   - ✅ 導向 /workspace
   - ✅ 顯示導航列（工作區、模板管理、歷史記錄、設定、使用說明）
   - ✅ 右上角顯示使用者名稱「測試使用者」

---

### 測試 2: 工作區載入

1. 登入後在工作區頁面
2. **預期結果**：
   - ✅ 顯示「本月已使用 0 / 100」（或其他配額）
   - ✅ 文章輸入框可用
   - ✅ AI 引擎選單顯示 Gemini（預設）
   - ✅ 模板區域顯示 3 個預設模板
   - ✅ 所有模板預設勾選
   - ✅ 「產出」按鈕可用
   - ✅ 右側顯示「尚未產出內容」

---

### 測試 3: AI 產出功能（完整流程）

1. **在文章輸入框貼上測試文章**：
   ```
   今天我想分享一個很棒的想法：如何提升工作效率。

   第一，設定明確的目標。每天早上列出三件最重要的事情，專注完成它們。

   第二，使用番茄工作法。專注工作 25 分鐘，然後休息 5 分鐘，保持高效的工作狀態。

   第三，定期回顧和調整。每週檢視自己的進度，找出可以改進的地方。

   這些方法幫助我在工作中更有生產力，也希望能幫助到你。
   ```

2. **確認設定**：
   - AI 引擎：Gemini
   - 勾選所有 3 個模板

3. **點擊「產出」按鈕**

4. **預期結果**：
   - ✅ 按鈕變為 disabled
   - ✅ 顯示 Loading 動畫
   - ✅ 顯示「AI 正在為您產出 3 個版本的貼文，預計需要 30-60 秒...」
   - ✅ 等待約 10-30 秒後顯示結果
   - ✅ 產出 3 個不同風格的短文（專業風格、輕鬆風格、故事風格）
   - ✅ 每個結果顯示模板名稱
   - ✅ 每個結果有「複製」按鈕
   - ✅ 按鈕顯示倒數「請稍候 60 秒」
   - ✅ 使用量更新為「本月已使用 1 / 100」

5. **點擊「複製」按鈕**：
   - ✅ 顯示 alert：「✓ 已複製！前往 Threads 發佈」
   - ✅ 內容已複製到剪貼簿

---

### 測試 4: 錯誤處理

#### 4.1 測試空白輸入
1. 清空文章輸入框
2. 點擊「產出」
3. **預期結果**：
   - ✅ 顯示錯誤訊息「請輸入文章內容」

#### 4.2 測試未選擇模板
1. 取消勾選所有模板
2. 輸入文章
3. 點擊「產出」
4. **預期結果**：
   - ✅ 顯示錯誤訊息「請至少選擇一個模板」

#### 4.3 測試配額限制
1. 在 Supabase 更新配額為已達上限：
   ```sql
   UPDATE public.usage_quota
   SET monthly_usage = monthly_limit
   WHERE user_id = (
     SELECT id FROM public.profiles WHERE email = 'test@example.com'
   );
   ```
2. 重新整理頁面
3. 嘗試產出
4. **預期結果**：
   - ✅ 使用量顯示「本月已使用 100 / 100」
   - ✅ 顯示錯誤訊息「本月產出次數已達上限...」

---

### 測試 5: 倒數計時

1. 成功產出後
2. **預期結果**：
   - ✅ 「產出」按鈕變為「請稍候 60 秒」
   - ✅ 每秒倒數：59、58、57...
   - ✅ 倒數到 0 後按鈕恢復「產出」
   - ✅ 倒數期間按鈕 disabled

---

### 測試 6: 資料庫記錄

產出成功後，檢查資料庫：

```sql
-- 檢查歷史記錄
SELECT * FROM public.history
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'test@example.com'
)
ORDER BY created_at DESC
LIMIT 1;

-- 檢查使用量記錄
SELECT * FROM public.usage_logs
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'test@example.com'
)
ORDER BY created_at DESC
LIMIT 1;

-- 檢查配額更新
SELECT * FROM public.usage_quota
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'test@example.com'
);
```

**預期結果**：
- ✅ history 表有新記錄，包含 3 個 outputs
- ✅ usage_logs 表有新記錄，template_count = 3, success_count = 3
- ✅ usage_quota.monthly_usage 增加 1

---

## 🐛 已知問題與限制

1. **API Key 限制**：
   - 目前只支援 Gemini API
   - Claude 和 OpenAI 尚未實作（返回錯誤訊息）

2. **複製提示**：
   - 使用 alert，未來應改為優雅的 toast 通知

3. **月份重置**：
   - 需要手動測試（修改伺服器日期或等待月初）

---

## 📋 下一步開發

### 待開發頁面：
1. **模板管理頁面** (`/templates`)
   - 顯示、新增、編輯、刪除模板
   - 調整模板順序
   - 測試單個模板功能

2. **歷史記錄頁面** (`/history`)
   - 顯示歷史產出記錄
   - 查看詳細內容
   - 複製歷史結果
   - 刪除記錄

3. **設定頁面** (`/settings`)
   - 修改密碼
   - 選擇預設 AI 引擎
   - 查看帳號資訊

4. **管理員功能** (`/admin`)
   - 使用者管理
   - 預設模板管理
   - 系統監控

---

**測試日期**：2025-10-03
**版本**：v1.0 - 工作區基礎功能完成
