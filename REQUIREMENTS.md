# Content Rewriter 系統需求文件

## 專案概述

Content Rewriter 是一個網頁應用程式，旨在將使用者撰寫的長文章改寫成適合 Threads 社群平台的短篇貼文。系統支援多種 AI 引擎，並允許使用者自訂多個改寫模板，一次產出多種風格的貼文內容。

### 目標用戶
- **主要用戶**：創作者、作者、部落客
- **用戶痛點**：擅長撰寫長篇文章，但不擅長經營社群媒體、不知道如何將內容轉換為適合社群平台的短文
- **用戶需求**：快速將文章改寫成多種風格的 Threads 貼文，節省時間並提高社群曝光

### 產品定位
- **核心價值**：
  1. 模板化管理：可儲存和重複使用不同風格的改寫 prompt
  2. 多版本產出：一次產出多個版本，方便比較選擇最適合的內容
  3. Threads 優化：專為 Threads 平台設計（500 字限制、適合的格式和風格）
- **差異化優勢**：不只是單次改寫工具，而是「內容創作工作流程優化方案」
- **未來願景**：從內容改寫擴展到 Threads 排程發佈，成為「Threads 內容創作與發佈一站式平台」
- **商業模式**：邀請制，未來將透過其他方式收費

### 成功指標（KPIs）
- **主要指標**：使用者滿意度
- **次要指標**：
  - 每週活躍用戶數
  - 平均每位使用者每週產出次數
  - 使用者留存率（30 天）

---

## 核心功能需求

### 1. 使用者認證系統
- 使用 Supabase Authentication
- 支援 Email/密碼登入（不支援 Google OAuth）
- 確保使用者資料跨裝置同步
- **邀請制註冊流程**:
  - 管理員在 `/admin/users` 建立新使用者（填寫姓名、email、使用期限、備註）
  - 系統透過 Supabase 自動發送邀請信到使用者 email
  - 邀請連結有效期限為 7 天
  - 使用者點擊邀請連結後自行設定密碼
  - 若邀請過期，管理員可重新發送邀請
  - 使用者可隨時在設定頁面修改密碼
- **忘記密碼功能**:
  - 登入頁面提供「忘記密碼」連結
  - 點擊後輸入 email，系統發送密碼重設信
  - 使用者點擊信中連結，設定新密碼
  - 使用 Supabase 內建的密碼重設功能
- **角色權限系統**:
  - 使用者預設角色為 'user'
  - 管理員角色為 'admin'（可由資料庫手動設定）
  - Admin 使用者登入後，導航列會額外顯示「管理員」選單
  - Admin 可訪問 `/admin` 頁面管理預設模板和使用者
- **使用期限控制**:
  - 每個使用者都有使用起訖日（`access_start_date` 和 `access_end_date`）
  - 僅在有效期間內可登入使用
  - 期限外或帳號未啟用時，拒絕登入並顯示相應訊息
  - Admin 角色不受使用期限限制
  - 由管理員設定使用者的使用期限

### 2. 模板管理功能

#### 使用者模板管理 (`/templates`)
- **模板數量**:
  - 預設 3 個模板（來自管理員設定的預設模板）
  - 使用者可額外新增自訂模板
  - 每位使用者的模板總數上限為 6 個（透過環境變數控制）
- **模板內容**: 每個模板包含
  - 模板名稱
  - 改寫 Prompt（使用者自行輸入）
  - 排序順序
- **操作功能**:
  - 新增模板（在上限範圍內）
  - 編輯模板（包含預設模板）
  - 刪除模板（包含預設模板）
  - 調整模板順序
  - **測試模板**：每個模板旁有「測試」按鈕
    - 點擊後彈出視窗
    - 可輸入測試文章
    - 選擇 AI 引擎
    - 只產出該模板的結果
    - 可複製測試結果
    - **重要**：測試產出**不會**儲存到歷史記錄，也**不會**計入每月產出次數
- **儲存位置**: Supabase PostgreSQL 資料庫的 `templates` 表
- **預設模板複製機制**:
  - 使用者完成邀請並第一次登入時，系統自動從 `default_templates` 表複製所有啟用的預設模板
  - 複製時會將 `is_default` 標記為 true
  - 使用者可自由編輯或刪除這些模板
  - 管理員之後修改預設模板，不影響已註冊的使用者

#### 管理員功能 (`/admin`)
- **僅限 Admin 角色訪問**

##### 預設模板管理 (`/admin/templates`)
- 管理 `default_templates` 表（系統預設模板）
- 影響範圍：僅影響**新註冊**的使用者
- 操作功能：
  - 新增預設模板
  - 編輯預設模板
  - 刪除預設模板
  - 啟用/停用預設模板
  - 調整排序

##### 使用者管理 (`/admin/users`)
- 管理所有使用者帳號
- 操作功能：
  - 新增使用者（填寫姓名、email、使用起訖日、備註）
  - 發送邀請信（有效期限 7 天）
  - 重新發送邀請信（若邀請過期或使用者未完成設定）
  - 編輯使用者資料（姓名、使用期限、備註）
  - 啟用/停用使用者帳號（軟刪除，保留資料）
  - 檢視使用者列表（顯示姓名、email、使用期限、邀請狀態、帳號狀態、建立日期）
  - 搜尋和篩選使用者

##### 系統監控 (`/admin/dashboard` 或 `/admin`)
- 管理員儀表板，顯示系統統計和監控資訊
- 統計資訊：
  - 總使用者數（啟用/停用/待邀請）
  - 今日產出次數
  - 本週產出次數
  - 各 AI 引擎使用次數統計
  - 各使用者本月使用次數排行
  - 本月 AI 使用費用預估
- 系統日誌：
  - 顯示最近的錯誤記錄（AI 產出失敗、登入失敗等）
  - 每條日誌包含：時間、使用者、錯誤類型、錯誤訊息
  - 可按時間範圍篩選
- 近期活動：
  - 最近登入的使用者
  - 最近建立的使用者

##### 重大更新記錄 (`/admin/changelog`)
- 管理員記錄重要事件和系統更新的頁面
- **資料表**: `admin_changelog` 表
  ```sql
  id: uuid (primary key)
  date: timestamp (事件日期)
  event_type: string (事件類型：系統更新、使用者管理、模板調整、重大事件、其他)
  title: string (標題，例如：「新增 5 位使用者」)
  content: text (詳細說明)
  affected_scope: string (影響範圍，可選)
  created_by: uuid (建立者，foreign key -> users.id)
  created_at: timestamp
  ```
- 功能：
  - 新增記錄
  - 編輯記錄
  - 刪除記錄
  - 依日期排序顯示（最新在前）
  - 依事件類型篩選

### 3. 文章改寫功能
- **輸入方式**: 使用者複製貼上文章內容
- **AI 引擎選擇**:
  - 支援多種 AI（Gemini, Claude API, OpenAI API）
  - 預設 AI 引擎為 Gemini
  - 使用者可在輸入區選擇要使用的 AI
  - 選擇會儲存在使用者的 settings 中
- **輸入區控制**:
  - 「產出」按鈕：開始產出
  - 「清除」按鈕：清空輸入框
  - 產出後保留輸入內容，方便修改後重新產出
- **模板選擇**:
  - 使用者可勾選要產出的模板（不一定要全部產出）
  - 預設全部勾選
  - 至少要勾選一個模板才能產出
- **產出方式**:
  - 點擊「產出」後，使用勾選的模板依序產出（一次一個，非並發）
  - 每個模板產出一個符合 Threads 格式的貼文（500 字以內）
  - **進度顯示**：
    - 顯示 Loading 動畫和提示文字：「AI 正在為您產出 X 個版本的貼文，預計需要 30-60 秒...」
    - 不顯示個別模板的即時進度（使用簡單 Loading 狀態）
    - 全部產出完成後一次顯示所有結果
- **頻率限制 (Rate Limiting)**:
  - 點擊「產出」後，按鈕 disabled 60 秒（前端防抖）
  - 顯示倒數計時：「請稍候 X 秒後再次產出」
  - 防止使用者短時間內重複點擊造成資源浪費
- **產出結果**:
  - 每個產出結果顯示模板名稱
  - 每個產出結果可獨立編輯
  - 提供一鍵複製功能
  - 複製後顯示提示訊息：「✓ 已複製！前往 Threads 發佈」（2 秒後自動消失）
  - 產出成功後，**自動儲存到歷史記錄**，並**計入每月產出次數**
- **錯誤處理**:
  - 若某個模板產出失敗，該模板顯示錯誤訊息和「重試」按鈕
  - 其他模板正常顯示結果
  - 可單獨重試失敗的模板，無需全部重新產出

### 4. 歷史記錄功能
- **歷史記錄頁面** (`/history`):
  - 以列表方式呈現過去的產出記錄
  - 每筆記錄顯示：
    - 產出日期時間
    - 使用的 AI 引擎
    - 產出的模板數量
    - 第一個成功產出的內容預覽（前 100 字）
  - 點擊某筆記錄，展開查看：
    - 所有產出結果（模板名稱 + 內容 + 狀態）
    - 每個產出結果可複製
    - 失敗的產出會顯示錯誤訊息
  - 功能：
    - 依日期篩選
    - 刪除記錄
    - 分頁顯示（每頁 20 筆）
  - 顯示使用者歷史記錄總數：「共 X 筆記錄（上限 100 筆）」
  - **隱私說明**：系統不儲存原始文章，僅保留 AI 產出的結果

### 5. 使用量管理
- **每月產出次數限制**：
  - 每位使用者都有每月產出次數上限
  - 管理員可為每位使用者個別設定上限（預設值可透過環境變數控制）
  - 每次點擊「產出」按鈕計為一次（無論產出幾個模板）
  - 達到上限後，使用者無法繼續產出，顯示提示訊息：「本月產出次數已達上限（X/X），請聯絡管理員或等待下月重置」
  - 每月 1 日自動重置為 0
  - 在工作頁面顯示當前使用量：「本月已使用 X / Y 次」
- **使用量統計**（管理員儀表板）：
  - 各使用者本月使用次數排行
  - 本月總產出次數
  - AI 使用費用預估（基於各 AI 的定價）

### 6. 設定頁面
- **設定頁面** (`/settings`):
  - **修改密碼**：
    - 輸入目前密碼
    - 輸入新密碼（兩次確認）
  - **選擇預設 AI 引擎**：
    - 下拉選單選擇（Gemini / Claude / OpenAI）
    - 儲存後，工作頁面會預設選擇此 AI
  - **帳號資訊**（僅可查看，不可修改）：
    - 姓名
    - Email
    - 使用期限（開始日期 ~ 結束日期）
    - 本月產出次數 / 上限

### 6. 使用說明頁面
- **使用說明頁面** (`/guide`):
  - 提供完整的系統使用說明
  - 內容架構：
    1. **快速開始**
       - 登入系統
       - 認識介面（導航列、工作區、模板等）
    2. **如何產出貼文**
       - 步驟說明：貼上文章 → 選擇 AI → 勾選模板 → 產出
       - 如何編輯產出結果
       - 如何複製貼文
    3. **模板管理**
       - 如何查看預設模板
       - 如何新增自訂模板
       - 如何編輯和刪除模板
       - 如何測試單個模板
    4. **歷史記錄**
       - 如何查看過去的產出
       - 如何搜尋和篩選
       - 如何複製歷史記錄中的內容
    5. **帳號設定**
       - 如何修改密碼
       - 如何更改預設 AI
       - 如何查看使用期限
    6. **常見問題 FAQ**
       - 忘記密碼怎麼辦？
       - 為什麼產出失敗？
       - 使用期限到期了怎麼辦？
       - 模板數量有限制嗎？
       - **資料隱私與安全**：
         - 我的文章內容會被儲存嗎？
           - 系統僅在產出時即時處理您的文章，不會永久儲存原始文章內容
           - 僅在歷史記錄中保留產出結果，您可隨時刪除不需要的記錄
         - 誰可以看到我的資料？
           - 您的模板、設定、歷史記錄都是私人的，只有您本人可以存取
           - 管理員無法查看您的個人模板或歷史記錄內容
           - 管理員可以看到系統層級的統計資料（如產出次數）
         - 資料會跨裝置同步嗎？
           - 是的，所有資料透過 Supabase 雲端同步，您可在任何裝置登入使用
         - AI 會如何使用我的文章？
           - 您的文章會傳送到所選擇的 AI 服務（Gemini/Claude/OpenAI）進行改寫
           - 各 AI 服務有各自的隱私政策，請參考其官方說明
           - 系統不會將您的文章用於其他目的
  - 每個章節包含文字說明和範例截圖（未來實作時補充）
  - 使用手風琴式摺疊設計，點擊展開內容

### 7. 頁面佈局
- **模板管理頁面**:
  - 統一管理所有模板
  - 清楚的 CRUD 操作介面

- **主要工作頁面** (左右分割佈局):
  - **左側**:
    - 文章輸入區域（支援多行文字輸入）
    - AI 引擎選擇下拉選單
    - 「產出」按鈕、「清除」按鈕
  - **右側**:
    - 模板選擇區（勾選要產出的模板）
    - 顯示選中模板的產出結果
    - 每個結果以卡片形式呈現
    - 卡片包含：模板名稱、可編輯的內容區域、複製按鈕

---

## 技術架構

### 前端
- **框架**: React 18+ with TypeScript
- **路由**: React Router (每個頁籤都有獨立的 URL)
- **UI 框架**: Tailwind CSS
- **狀態管理**: React Context API / Zustand
- **部署**: Vercel

### 後端架構
- **Serverless Functions**: Vercel Serverless Functions (API Routes)
  - 處理所有 AI API 調用（安全性考量，不在前端調用）
  - 身份驗證：使用 Supabase JWT 驗證請求
  - 業務邏輯：配額檢查、歷史記錄儲存等
- **Backend as a Service**: Supabase
  - Authentication (使用者認證)
  - PostgreSQL Database (資料儲存)
  - Row Level Security (資料安全)

### API 設計
- **AI 產出 API**:
  - `POST /api/generate` - 正式產出（計入配額、儲存歷史）
  - `POST /api/templates/test` - 測試模板（不計配額、不儲存）
- **系統架構流程**:
  ```
  前端 (React)
    ↓
  Vercel Serverless Functions
    ↓ 驗證 Supabase JWT
    ↓ 檢查 usage_quota
    ↓ 調用 AI API (Gemini/Claude/OpenAI)
    ↓ 儲存到 history 表
    ↓ 返回結果
  ```

### AI 整合
- **AI 服務**:
  - Google Gemini API（預設）
  - Anthropic Claude API
  - OpenAI API
  - 設計為可擴充架構，便於未來新增更多 AI
- **API Key 管理**:
  - 所有 API Key 儲存在 Vercel 環境變數
  - 僅後端可存取，絕不暴露給前端
  - 所有 AI 調用統一在後端處理

---

## 資料庫設計

### profiles 表 (使用者資料表)
```sql
id: uuid (primary key, foreign key -> auth.users.id)
email: string (複製自 auth.users.email，方便查詢)
name: string (使用者姓名)
role: string (使用者角色: 'user' 或 'admin'，預設為 'user')
access_start_date: timestamp (使用權限開始日期，nullable)
access_end_date: timestamp (使用權限結束日期，nullable)
is_active: boolean (帳號是否啟用，預設 true)
note: text (備註欄，nullable)
created_at: timestamp (建立日期)
updated_at: timestamp (最後更新日期)
```
- **說明**:
  - Supabase 的認證資料儲存在 `auth.users` 表（系統管理，不應直接修改）
  - `profiles` 表儲存業務相關的使用者資料
  - 透過 Database Trigger 在 `auth.users` 新增時自動建立對應的 `profiles` 記錄
- **存取控制邏輯**:
  - 登入時檢查 `is_active` 是否為 true
  - 檢查當前時間是否在 `access_start_date` 和 `access_end_date` 之間
  - 不符合條件則拒絕登入，顯示「帳號已停用」或「使用期限已過」訊息
  - Admin 角色不受使用期限限制

### default_templates 表 (系統預設模板)
```sql
id: uuid (primary key)
name: string (模板名稱)
prompt: text (改寫指令的 prompt)
order: integer (排序順序)
is_active: boolean (是否啟用，預設 true)
created_at: timestamp
updated_at: timestamp
```
- 僅管理員可編輯
- 使用者第一次登入時，自動複製所有 is_active=true 的預設模板到該使用者的 templates 表

### templates 表 (使用者個人模板)
```sql
id: uuid (primary key)
user_id: uuid (foreign key -> users.id)
name: string (模板名稱)
prompt: text (改寫指令的 prompt)
order: integer (排序順序)
is_default: boolean (是否來自預設模板，預設 false)
created_at: timestamp
updated_at: timestamp
```
- 使用者可自由新增、編輯、刪除自己的模板
- 即使是從預設模板複製來的，也可以完全自訂

### settings 表
```sql
id: uuid (primary key)
user_id: uuid (foreign key -> users.id)
default_ai: string (預設 AI 引擎, 如 'gemini', 'claude', 'openai'，預設為 'gemini')
updated_at: timestamp
```
- 使用者第一次登入時，自動建立 settings 記錄，default_ai 設為 'gemini'
- 模板數量上限透過環境變數控制（`MAX_TEMPLATES`，預設為 6）

### usage_logs 表 (使用記錄)
```sql
id: uuid (primary key)
user_id: uuid (foreign key -> users.id)
ai_engine: string (使用的 AI 引擎)
template_count: integer (產出的模板數量)
success_count: integer (成功產出的數量)
error_count: integer (失敗的數量)
created_at: timestamp
```
- 記錄每次產出行為，用於統計分析
- 僅保留最近 90 天的記錄（可設定自動清理）

### error_logs 表 (錯誤日誌)
```sql
id: uuid (primary key)
user_id: uuid (foreign key -> users.id, nullable)
error_type: string (錯誤類型: 'ai_api_error', 'auth_error', 'system_error' 等)
error_message: text (錯誤訊息)
context: jsonb (相關資訊，如 AI 引擎、模板 ID 等)
created_at: timestamp
```
- 記錄系統錯誤，供管理員檢視和除錯
- **保留最近 90 天的記錄**（可設定自動清理）

### admin_changelog 表 (管理員重大更新記錄)
```sql
id: uuid (primary key)
date: timestamp (事件日期)
event_type: string (事件類型)
title: string (標題)
content: text (詳細說明)
affected_scope: string (影響範圍，nullable)
created_by: uuid (foreign key -> users.id)
created_at: timestamp
updated_at: timestamp
```
- 記錄管理員的重要事件和系統更新
- 永久保留

### history 表 (歷史記錄)
```sql
id: uuid (primary key)
user_id: uuid (foreign key -> profiles.id)
ai_engine: string (使用的 AI 引擎)
outputs: jsonb (產出結果陣列，詳細結構見下方)
created_at: timestamp
```
- **outputs 欄位結構**:
  ```typescript
  interface HistoryOutput {
    template_id: string;           // 模板 ID
    template_name: string;          // 模板名稱
    content: string;                // 產出內容
    status: 'success' | 'error';   // 產出狀態
    error_message?: string;         // 錯誤訊息（失敗時才有）
    generated_at: string;           // 產出時間（ISO 格式）
  }
  ```
- **資料保留策略**:
  - **每位使用者最多保留 100 筆記錄**（FIFO）
  - 新增記錄後，若總數超過 100 筆，自動刪除最舊的記錄
  - 使用簡單檢查機制（極少數情況可能暫時超過 1-2 筆，下次會自動修正）
- **隱私說明**:
  - **不儲存原始文章內容**（已移除 original_text 欄位）
  - 僅儲存 AI 產出的結果
- 使用者可在歷史記錄頁面查看、複製過去的產出
- 使用者可手動刪除不需要的記錄

### usage_quota 表 (使用量配額)
```sql
id: uuid (primary key)
user_id: uuid (foreign key -> profiles.id)
monthly_limit: integer (每月產出次數上限)
current_month: string (當前月份，格式：YYYY-MM)
usage_count: integer (當月已使用次數)
updated_at: timestamp
```
- 記錄每位使用者的產出配額和當月使用量
- **每月重置機制**（首次使用檢查）:
  - 每次產出時檢查 `current_month` 是否為當前月份
  - 若不是（例如從 2025-10 變成 2025-11），自動重置：
    - `current_month = 當前月份`
    - `usage_count = 0`
  - 優點：免費方案可用，不需要 Cron Jobs
  - 說明：不是在每月 1 日 00:00 整點重置，而是使用者當月首次使用時重置
- 每次產出時檢查是否超過限制

### Row Level Security (RLS) 政策
- **profiles 表**: 使用者只能讀取自己的資料；Admin 可讀取所有使用者
- **default_templates 表**:
  - 所有人可讀取
  - 僅 role='admin' 可新增、編輯、刪除
- **templates 表**: 每個使用者只能存取自己的 templates
- **settings 表**: 每個使用者只能存取自己的 settings
- **usage_logs 表**: 使用者只能讀取自己的記錄；Admin 可讀取所有記錄
- **error_logs 表**: 僅 Admin 可讀取
- **history 表**: 每個使用者只能存取自己的歷史記錄
- **usage_quota 表**: 使用者只能讀取自己的配額；Admin 可讀取和修改所有配額
- **admin_changelog 表**: 僅 Admin 可讀取和修改

### 資料庫 Triggers
```sql
-- 當 auth.users 新增時，自動建立 profiles 記錄
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Trigger Function 範例
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, is_active, created_at)
  VALUES (NEW.id, NEW.email, 'user', true, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## UI/UX 設計規範

### 設計風格參考
- **參考網站**: https://www.aura.build/share/O0SB9DW
- **重要原則**: 所有視覺設計必須嚴格遵循此參考網站的色系與風格，無需再次確認
- **設計重點**:
  - 現代、簡潔的介面
  - 柔和的配色方案
  - 舒適的間距和排版
  - 流暢的互動體驗
  - 優雅的過渡動畫

### 色彩與視覺
- 完全採用參考網站的色系
- 保持高對比度以確保可讀性
- 統一的圓角、陰影風格
- 響應式設計（支援桌面和平板）
- 主要使用情境為桌面，但不刻意排除行動裝置

### 導航設計
- 採用頂部導航列設計
- 導航列包含：
  - Logo / 專案名稱（左側）
  - 主選單：工作區、模板管理、歷史記錄、使用說明
  - 右上角：
    - 歡迎語：「Hi XX」（XX 為使用者姓名）
    - 使用者選單下拉：設定、登出
    - 管理員選單（僅 Admin 可見）：管理後台
- 導航列在所有頁面保持一致

### 路由設計原則
- **核心原則**: 每個頁籤都必須有獨立的 URL
- **好處**:
  - 可直接分享特定頁面連結
  - 瀏覽器「上一頁」、「下一頁」正常運作
  - 重新整理頁面會停留在同一頁籤
  - 可加入瀏覽器書籤
- **路由規劃**:
  - `/` - 首頁/登入頁
  - `/forgot-password` - 忘記密碼頁面
  - `/invite` - 使用者邀請頁面（設定密碼）
  - `/workspace` - 主要工作頁面
  - `/templates` - 模板管理頁面（使用者個人模板）
  - `/history` - 歷史記錄頁面
  - `/settings` - 設定頁面
  - `/guide` - 使用說明頁面
  - `/admin` - 管理員儀表板（系統監控）（僅 Admin 角色可訪問）
  - `/admin/templates` - 管理預設模板
  - `/admin/users` - 管理使用者帳號

### 互動設計
- 按鈕和操作需有明確的視覺反饋
- Loading 狀態清晰呈現
- 錯誤訊息友善且具指導性
- 成功操作提供確認提示

### 使用期限提醒
- 當使用者的帳號使用期限距離到期日少於 7 天時：
  - 登入後在頁面頂部顯示提醒橫幅
  - 橫幅內容：「您的帳號將於 YYYY 年 MM 月 DD 日到期，如需延長請聯絡管理員」
  - 橫幅可關閉，但每次登入都會再次顯示（直到期限更新）
  - 橫幅使用警告色系（如黃色或橘色）
- Admin 角色不顯示此提醒

---

## 功能流程

### 管理員邀請使用者流程
1. 管理員登入系統
2. 進入 `/admin/users` 頁面
3. 點擊「新增使用者」按鈕
4. 填寫使用者資料（姓名、email、使用起訖日、備註）
5. 點擊「發送邀請」按鈕
6. 系統透過 Supabase 發送邀請信到使用者 email

### 使用者首次使用流程
1. 使用者收到邀請信
2. 點擊信中的邀請連結
3. 進入 `/invite?token=xxx` 頁面
4. 設定密碼並確認
5. 系統自動登入使用者帳號
6. **系統自動複製 3 個預設模板**到使用者的 templates 表
7. 導向 `/workspace` 主要工作頁面開始使用

### 日常使用流程
1. 登入系統
2. 在主要工作頁面左側貼上文章
3. 選擇 AI 引擎
4. 點擊「產出」
5. 系統使用所有模板同時產出多個版本的貼文
6. 在右側檢視結果，根據需要編輯
7. 複製想要的貼文內容至 Threads

### 模板管理流程
1. 進入模板管理頁面
2. 檢視現有模板列表
3. 新增/編輯/刪除模板
4. 調整模板順序
5. 儲存變更（自動同步至雲端）

---

## 非功能性需求

### 邊界條件定義
- **文章輸入最大字數**: 3,000 字
  - 超過限制時顯示錯誤提示：「文章長度超過上限（3,000 字），請縮減內容」
- **模板 Prompt 最大字數**: 500 字
  - 超過限制時無法儲存，顯示錯誤提示
- **模板名稱最大字數**: 50 字
- **使用者姓名最大字數**: 10 字
- **AI 產出失敗重試次數**: 2 次
  - 重試 2 次後仍失敗，顯示錯誤訊息並提供「重試」按鈕
- **產出結果字數上限**: 500 字（符合 Threads 限制）
- **歷史記錄上限**: 每位使用者 100 筆
- **模板數量上限**: 每位使用者 6 個（可透過環境變數調整）

### 效能要求
- 頁面載入時間 < 2 秒
- 單個模板 AI 產出回應時間 < 10 秒（視 AI 服務而定）
- 支援依序產出 6 個模板（預估總時間 < 60 秒）
- 透過 Supabase Realtime 即時更新產出進度

### 降級與錯誤處理方案
- **AI API 故障處理**：
  - 如果選擇的 AI 引擎故障、達到配額上限或 API Key 失效：
    - 顯示友善錯誤訊息：「AI 服務暫時無法使用，請稍後再試或選擇其他 AI 引擎」
    - 不自動切換到其他 AI 引擎
    - 使用者可手動切換 AI 引擎後重試
  - 重試機制：自動重試 2 次，失敗後顯示「重試」按鈕供使用者手動重試
- **Supabase 資料庫故障**：
  - 資料庫連線失敗或服務中斷時：
    - 顯示友善的錯誤頁面：「系統維護中，請稍後再試」
    - 整個系統依賴 Supabase，故障時無法正常運作
  - 自動重試連線 3 次（間隔 2 秒）
  - 所有重試失敗後提示使用者聯絡管理員
- **網路連線問題**：
  - 前端偵測到網路斷線或請求逾時：
    - 顯示連線錯誤提示：「網路連線不穩定，請檢查您的網路狀態」
    - 提供「重試」按鈕
  - 產出進行中斷線：保留已產出的結果，未完成的可重新產出
- **部分模板產出失敗**：
  - 某些模板產出失敗時，成功的模板仍正常顯示結果
  - 失敗的模板顯示錯誤訊息和單獨的「重試」按鈕
  - 使用者可單獨重試失敗的模板，無需全部重新產出

### 安全性要求
- 所有 API 金鑰儲存於環境變數
- 使用 HTTPS 加密傳輸
- Supabase RLS 確保使用者資料隔離
- 不記錄或儲存使用者的文章內容（僅即時處理）

### 可用性要求
- 支援 Chrome, Firefox, Safari, Edge 最新版本
- 響應式設計，主要針對桌面優化（建議最小寬度 1024px）
- 支援平板和行動裝置，但使用體驗以桌面為主
- 跨裝置資料同步（透過 Supabase）

### 可維護性
- 模組化程式碼架構
- TypeScript 確保型別安全
- 清晰的註解和文件
- 易於新增更多 AI 引擎

---

## 開發階段規劃

### Phase 1: 基礎架構
- [ ] 建立 React + TypeScript 專案
- [ ] 整合 Tailwind CSS
- [ ] 設定 Supabase 專案
- [ ] 建立資料庫結構
- [ ] 實作使用者認證

### Phase 2: 核心功能
- [ ] 實作模板管理頁面
- [ ] 實作主要工作頁面佈局
- [ ] 整合 Claude API
- [ ] 整合 OpenAI API
- [ ] 實作改寫邏輯

### Phase 3: UI/UX 優化
- [ ] 參考設計網站調整視覺風格
- [ ] 新增 Loading 動畫
- [ ] 新增錯誤處理與提示
- [ ] 新增複製功能
- [ ] 新增編輯功能

### Phase 4: 測試與部署
- [ ] 功能測試
- [ ] 跨瀏覽器測試
- [ ] 效能優化
- [ ] 部署至 Vercel
- [ ] 監控與錯誤追蹤設定

---

## 未來擴充功能（可選）

- 匯出/匯入模板功能
- 歷史記錄功能（儲存過去的改寫結果）
- 批次處理多篇文章
- 更多 AI 引擎整合
- 自訂字數限制
- 多語言支援
- 團隊協作功能

---

## 技術限制與注意事項

### Supabase 免費方案限制
- 500MB 資料庫空間
- 50,000 月活躍用戶
- 2GB 檔案儲存（本專案不使用檔案儲存）

### AI API 費用與管理
- Gemini API: 依使用量計費
- Claude API: 依使用量計費
- OpenAI API: 依使用量計費
- **API Key 管理策略**:
  - 由管理員統一提供和管理所有 AI 服務的 API Key
  - API Key 儲存在環境變數中
  - 所有使用者共用這些 API Key
  - 所有 AI 使用費用由管理員負擔
  - 管理員可在部署平台（Vercel）設定環境變數來更新 API Key

### 環境變數設定
系統需要以下環境變數：

**後端專用（不暴露給前端）**：
- `GEMINI_API_KEY` - Google Gemini API Key
- `CLAUDE_API_KEY` - Anthropic Claude API Key
- `OPENAI_API_KEY` - OpenAI API Key
- `SUPABASE_URL` - Supabase 專案 URL
- `SUPABASE_ANON_KEY` - Supabase 匿名金鑰（用於 RLS）
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase Service Role Key（用於後端繞過 RLS）

**前端可讀取（使用 NEXT_PUBLIC_ 前綴）**：
- `NEXT_PUBLIC_MAX_TEMPLATES` - 模板數量上限（預設 6）
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 專案 URL（前端連線用）
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名金鑰（前端認證用）

### Vercel 免費方案限制
- 100GB 頻寬/月
- 無限請求次數
- 適合個人使用

### 監控與錯誤追蹤
**階段一：基礎監控（上線時）**
- 使用 Vercel 內建 Analytics 監控效能
- 使用 Vercel Logs 查看系統日誌
- 錯誤記錄到 `error_logs` 表，管理員在後台查看
- 優點：免費、簡單、夠用

**階段二：進階監控（使用者增長後）**
- 整合 Sentry 進行錯誤追蹤和告警（免費方案：5,000 errors/月）
- 設定 AI API 費用監控和告警
- 效能監控和優化

### 測試模板功能技術實作
**API 端點**：`POST /api/templates/test`

**請求參數**：
```typescript
{
  template_id: string;
  test_article: string;
  ai_engine: 'gemini' | 'claude' | 'openai';
}
```

**回傳結果**：
```typescript
{
  result: string;  // AI 產出的內容
  error?: string;  // 錯誤訊息（失敗時）
}
```

**實作邏輯**：
- 不檢查 usage_quota（測試不計入配額）
- 不寫入 history 表（測試不儲存）
- 不寫入 usage_logs 表
- 僅調用 AI API 並立即返回結果

---

## 結語

本系統設計以簡潔、高效、美觀為核心原則，確保使用者能夠快速上手並享受流暢的使用體驗。透過雲端同步機制，使用者可在任何裝置上無縫使用服務。模組化的架構設計也為未來的功能擴充預留了空間。
