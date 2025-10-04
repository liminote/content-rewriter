# Content Rewriter

AI 驅動的文章改寫工具，專為 Threads 平台設計，將長文章快速轉換成多種風格的短篇貼文。

## 功能特色

- 🤖 **多 AI 引擎支援**：整合 Gemini、Claude、OpenAI
- 📝 **模板管理**：可自訂多個改寫模板，一次產出多種風格
- 📊 **歷史記錄**：自動儲存產出結果，方便回顧和重複使用
- 👥 **邀請制註冊**：管理員控制使用者存取權限
- 🎨 **現代化介面**：基於 Tailwind CSS 的美觀設計

## 技術棧

### 前端
- React 18 + TypeScript
- Vite
- React Router
- Tailwind CSS
- Zustand (狀態管理)
- Supabase Client

### 後端
- Vercel Serverless Functions
- Supabase (Authentication + PostgreSQL)
- AI APIs (Gemini, Claude, OpenAI)

## 開發指南

### 環境需求

- Node.js 18+
- npm 或 yarn

### 安裝步驟

1. 複製專案
```bash
git clone <repository-url>
cd content-rewriter
```

2. 安裝依賴
```bash
npm install
```

3. 設定環境變數
```bash
cp .env.example .env.local
```

編輯 `.env.local`，填入你的 Supabase 設定：
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_MAX_TEMPLATES=6
```

4. 啟動開發伺服器
```bash
npm run dev
```

5. 開啟瀏覽器訪問 `http://localhost:3000`

### 建置部署

```bash
npm run build
```

## 專案結構

```
content-rewriter/
├── src/
│   ├── components/       # React 元件
│   │   ├── common/      # 共用元件
│   │   ├── workspace/   # 工作頁面元件
│   │   ├── admin/       # 管理員頁面元件
│   │   └── ...
│   ├── pages/           # 頁面元件
│   ├── lib/             # 工具函式
│   │   ├── ai/         # AI 整合
│   │   └── supabase/   # Supabase 客戶端
│   ├── store/           # 狀態管理
│   ├── types/           # TypeScript 型別定義
│   └── App.tsx          # 主應用程式
├── api/                 # Vercel Serverless Functions
├── supabase/            # 資料庫 migrations
└── public/              # 靜態資源
```

## 文件

- [需求文件](./REQUIREMENTS.md) - 完整的系統需求說明
- [技術設計文件](./TECHNICAL_DESIGN.md) - 技術架構與實作細節

## 授權

Private - All Rights Reserved
