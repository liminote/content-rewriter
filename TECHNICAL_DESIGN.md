# Content Rewriter 技術設計文件

## 文件版本
- **版本**: 1.1
- **更新日期**: 2025-10-04
- **作者**: Claude (基於 CTO 審查後的技術決策)
- **變更記錄**: 新增併發處理、Rate Limiting、錯誤處理章節

---

## 1. 系統架構概覽

### 1.1 技術棧

```
┌─────────────────────────────────────────────────────────┐
│                      使用者瀏覽器                          │
│                                                           │
│  React 18 + TypeScript + Tailwind CSS                   │
│  React Router + Zustand/Context API                     │
└─────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│                    Vercel (部署平台)                       │
│                                                           │
│  ┌─────────────────┐      ┌─────────────────────────┐   │
│  │  Static Assets  │      │  Serverless Functions   │   │
│  │  (React Build)  │      │  - /api/generate        │   │
│  └─────────────────┘      │  - /api/templates/test  │   │
│                           │  - /api/* (其他 API)     │   │
│                           └─────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
        ┌───────────────────┐  ┌──────────────────┐
        │    Supabase       │  │   AI APIs        │
        │                   │  │                  │
        │  - Auth           │  │  - Gemini API    │
        │  - PostgreSQL     │  │  - Claude API    │
        │  - RLS            │  │  - OpenAI API    │
        └───────────────────┘  └──────────────────┘
```

### 1.2 核心技術決策

| 決策項目 | 選擇方案 | 理由 |
|---------|---------|------|
| 前端框架 | React 18 + TypeScript | 類型安全、生態成熟 |
| UI 框架 | Tailwind CSS | 快速開發、設計一致性 |
| 後端架構 | Vercel Serverless Functions | 免費額度、易部署、與前端統一平台 |
| 資料庫 | Supabase PostgreSQL | BaaS、內建認證、RLS 安全 |
| AI API 調用 | 後端調用（非前端） | 保護 API Key、安全性 |
| 即時進度 | 簡單 Loading 狀態 | 降低複雜度、使用者可接受 |
| Rate Limiting | 前端防抖（60秒） | 簡單有效、免費方案可用 |
| 監控 | Vercel 內建 → Sentry | 階段性擴充、成本控制 |

---

## 2. API 設計規範

### 2.1 API 端點清單

#### 認證相關
- `POST /api/auth/check-access` - 檢查使用者存取權限（期限、is_active）

#### AI 產出
- `POST /api/generate` - 正式產出（計入配額、儲存歷史）
- `POST /api/templates/test` - 測試模板（不計配額、不儲存）

#### 模板管理
- `GET /api/templates` - 取得使用者模板列表
- `POST /api/templates` - 新增模板
- `PUT /api/templates/:id` - 更新模板
- `DELETE /api/templates/:id` - 刪除模板

#### 系統配置
- `GET /api/config` - 取得系統配置（選用，若需要動態配置）

### 2.2 核心 API 詳細設計

#### POST /api/generate (正式產出)

**請求**:
```typescript
interface GenerateRequest {
  article: string;                  // 文章內容（最大 3000 字）
  template_ids: string[];           // 選中的模板 ID 陣列
  ai_engine: 'gemini' | 'claude' | 'openai';
}
```

**流程**:
```
1. 驗證 Supabase JWT Token
2. 檢查使用者 access 權限（期限、is_active）
3. 檢查 usage_quota:
   - 若 current_month != 當前月份 → 重置配額
   - 若 usage_count >= monthly_limit → 返回錯誤
4. 依序調用 AI API 產出各模板內容
5. 儲存到 history 表
6. 更新 usage_quota.usage_count + 1
7. 記錄到 usage_logs 表
8. 返回所有產出結果
```

**回傳**:
```typescript
interface GenerateResponse {
  outputs: Array<{
    template_id: string;
    template_name: string;
    content: string;
    status: 'success' | 'error';
    error_message?: string;
    generated_at: string;  // ISO 8601
  }>;
  usage: {
    current: number;   // 當月已使用
    limit: number;     // 當月上限
  };
}
```

**錯誤碼**:
- `401` - 未授權
- `403` - 帳號已停用或期限已過
- `429` - 配額已用盡
- `500` - AI API 調用失敗

---

#### POST /api/templates/test (測試模板)

**請求**:
```typescript
interface TestTemplateRequest {
  template_id: string;
  test_article: string;
  ai_engine: 'gemini' | 'claude' | 'openai';
}
```

**流程**:
```
1. 驗證 Supabase JWT Token
2. 取得模板資訊（名稱、prompt）
3. 調用 AI API 產出內容
4. 直接返回結果（不儲存、不計配額）
```

**回傳**:
```typescript
interface TestTemplateResponse {
  result: string;       // 產出內容
  error?: string;       // 錯誤訊息
}
```

---

## 3. 資料庫設計

### 3.1 完整 Schema

```sql
-- ============================================
-- 使用者資料表（業務資料）
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  access_start_date TIMESTAMPTZ,
  access_end_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 系統預設模板
-- ============================================
CREATE TABLE default_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 使用者個人模板
-- ============================================
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 使用者設定
-- ============================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  default_ai TEXT NOT NULL DEFAULT 'gemini' CHECK (default_ai IN ('gemini', 'claude', 'openai')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 使用記錄
-- ============================================
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ai_engine TEXT NOT NULL,
  template_count INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_created ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_user_created ON usage_logs(user_id, created_at DESC);

-- ============================================
-- 錯誤日誌
-- ============================================
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_error_logs_created ON error_logs(created_at);

-- ============================================
-- 管理員更新記錄
-- ============================================
CREATE TABLE admin_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  affected_scope TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 歷史記錄（不儲存原始文章）
-- ============================================
CREATE TABLE history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ai_engine TEXT NOT NULL,
  outputs JSONB NOT NULL,  -- 詳細結構見下方
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_user_created ON history(user_id, created_at DESC);

-- outputs 欄位結構（JSONB）:
-- [
--   {
--     "template_id": "uuid",
--     "template_name": "專業風格",
--     "content": "產出內容...",
--     "status": "success",
--     "generated_at": "2025-10-03T10:30:00Z"
--   },
--   {
--     "template_id": "uuid",
--     "template_name": "輕鬆風格",
--     "content": "",
--     "status": "error",
--     "error_message": "AI API timeout",
--     "generated_at": "2025-10-03T10:30:45Z"
--   }
-- ]

-- ============================================
-- 使用量配額
-- ============================================
CREATE TABLE usage_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  monthly_limit INTEGER NOT NULL DEFAULT 100,
  current_month TEXT NOT NULL,  -- 格式: YYYY-MM
  usage_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_quota_user_month ON usage_quota(user_id, current_month);
```

### 3.2 Database Triggers

```sql
-- ============================================
-- 自動建立 profiles 記錄
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, is_active, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'user', true, NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 自動更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.3 Row Level Security (RLS) 政策

```sql
-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- profiles 表 RLS
-- ============================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- templates 表 RLS
-- ============================================
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

-- ============================================
-- default_templates 表 RLS
-- ============================================
CREATE POLICY "Everyone can view default templates"
  ON default_templates FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage default templates"
  ON default_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- history 表 RLS
-- ============================================
CREATE POLICY "Users can view own history"
  ON history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
  ON history FOR DELETE
  USING (auth.uid() = user_id);

-- （其他表的 RLS 政策類似）
```

---

## 4. AI 整合設計

### 4.1 AI Provider 抽象層

```typescript
// lib/ai/types.ts
export interface AIProvider {
  name: 'gemini' | 'claude' | 'openai';
  generateContent(prompt: string, article: string): Promise<string>;
}

// lib/ai/gemini.ts
export class GeminiProvider implements AIProvider {
  name = 'gemini' as const;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateContent(prompt: string, article: string): Promise<string> {
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${prompt}\n\n原始文章：\n${article}`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        }
      })
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
}

// lib/ai/factory.ts
export function createAIProvider(engine: string): AIProvider {
  switch (engine) {
    case 'gemini':
      return new GeminiProvider(process.env.GEMINI_API_KEY!);
    case 'claude':
      return new ClaudeProvider(process.env.CLAUDE_API_KEY!);
    case 'openai':
      return new OpenAIProvider(process.env.OPENAI_API_KEY!);
    default:
      throw new Error(`Unsupported AI engine: ${engine}`);
  }
}
```

### 4.2 重試邏輯

```typescript
// lib/ai/retry.ts
export async function retryAICall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  throw lastError!;
}
```

---

## 5. 前端架構設計

### 5.1 路由結構

```typescript
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/invite" element={<InvitePage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/guide" element={<GuidePage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/templates" element={<AdminTemplatesPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/changelog" element={<AdminChangelogPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

### 5.2 狀態管理

```typescript
// store/authStore.ts (使用 Zustand)
import create from 'zustand';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAccess: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // 取得 profile 資料並檢查存取權限
    const profile = await fetchProfile(data.user.id);
    const hasAccess = checkAccessDates(profile);

    if (!hasAccess) {
      throw new Error('帳號已停用或使用期限已過');
    }

    set({ user: data.user, profile });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  checkAccess: async () => {
    const { profile } = get();
    if (!profile) return false;

    return (
      profile.is_active &&
      new Date() >= new Date(profile.access_start_date) &&
      new Date() <= new Date(profile.access_end_date)
    );
  },
}));
```

### 5.3 API Client

```typescript
// lib/apiClient.ts
import { supabase } from './supabase';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export const api = {
  generate: async (data: GenerateRequest) =>
    fetchWithAuth('/api/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  testTemplate: async (data: TestTemplateRequest) =>
    fetchWithAuth('/api/templates/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
```

---

## 6. 核心功能實作細節

### 6.1 每月配額重置（首次使用檢查）

```typescript
// api/generate.ts
async function checkAndResetQuota(userId: string) {
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  const { data: quota } = await supabase
    .from('usage_quota')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!quota) {
    // 首次使用，建立配額記錄
    await supabase.from('usage_quota').insert({
      user_id: userId,
      monthly_limit: 100,
      current_month: currentMonth,
      usage_count: 0,
    });
    return { current: 0, limit: 100 };
  }

  if (quota.current_month !== currentMonth) {
    // 月份不同，重置配額
    await supabase
      .from('usage_quota')
      .update({
        current_month: currentMonth,
        usage_count: 0,
      })
      .eq('user_id', userId);

    return { current: 0, limit: quota.monthly_limit };
  }

  return { current: quota.usage_count, limit: quota.monthly_limit };
}
```

### 6.2 FIFO 歷史記錄刪除

```typescript
// api/generate.ts
async function saveToHistory(userId: string, data: HistoryData) {
  // 新增記錄
  await supabase.from('history').insert({
    user_id: userId,
    ai_engine: data.ai_engine,
    outputs: data.outputs,
  });

  // 檢查並刪除超過 100 筆的舊記錄
  const { data: histories } = await supabase
    .from('history')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (histories && histories.length > 100) {
    const toDeleteIds = histories.slice(100).map(h => h.id);
    await supabase
      .from('history')
      .delete()
      .in('id', toDeleteIds);
  }
}
```

### 6.3 前端 Rate Limiting (防抖)

```typescript
// components/GenerateButton.tsx
import { useState, useEffect } from 'react';

export function GenerateButton({ onClick }: { onClick: () => void }) {
  const [disabled, setDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setDisabled(false);
    }
  }, [countdown]);

  const handleClick = () => {
    onClick();
    setDisabled(true);
    setCountdown(60);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="btn-primary"
    >
      {disabled ? `請稍候 ${countdown} 秒` : '產出'}
    </button>
  );
}
```

---

## 7. 部署與環境設定

### 7.1 Vercel 環境變數設定

**Production 環境變數**:
```bash
# AI API Keys (後端專用)
GEMINI_API_KEY=xxxxx
CLAUDE_API_KEY=xxxxx
OPENAI_API_KEY=xxxxx

# Supabase (後端專用)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# 前端可讀取（使用 NEXT_PUBLIC_ 前綴）
NEXT_PUBLIC_MAX_TEMPLATES=6
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
```

### 7.2 Vercel 專案設定

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

### 7.3 部署流程

```bash
# 1. 安裝 Vercel CLI
npm i -g vercel

# 2. 登入 Vercel
vercel login

# 3. 連結專案
vercel link

# 4. 設定環境變數（Production）
vercel env add GEMINI_API_KEY production
# ... 其他環境變數

# 5. 部署
vercel --prod
```

---

## 8. 監控與維護

### 8.1 錯誤監控

**階段一：使用 Vercel Logs**
```bash
# 查看即時 logs
vercel logs --follow

# 查看特定 function 的 logs
vercel logs api/generate
```

**階段二：整合 Sentry**
```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// 在 API 中使用
try {
  // ...
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

### 8.2 效能監控指標

- **頁面載入時間**: 目標 < 2 秒
- **API 回應時間**:
  - `/api/generate`: < 60 秒（包含 AI 處理）
  - `/api/templates/*`: < 500ms
- **AI API 成功率**: > 95%
- **每月活躍使用者**: 追蹤趨勢
- **平均每位使用者產出次數**: 追蹤使用深度

---

## 9. 安全性考量

### 9.1 API Key 保護

✅ **正確做法**:
- AI API Key 儲存在 Vercel 環境變數
- 僅後端 Serverless Functions 可存取
- 前端透過自訂 API 調用 AI

❌ **絕對禁止**:
- 在前端直接調用 AI API
- 將 API Key 寫在程式碼中
- 透過 `NEXT_PUBLIC_` 暴露 AI API Key

### 9.2 認證與授權

```typescript
// middleware/auth.ts
export async function requireAuth(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Unauthorized');
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid token');
  }

  return user;
}

export async function requireAdmin(req: Request) {
  const user = await requireAuth(req);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return user;
}
```

### 9.3 資料驗證

```typescript
// lib/validation.ts
import { z } from 'zod';

export const generateRequestSchema = z.object({
  article: z.string().min(1).max(3000),
  template_ids: z.array(z.string().uuid()).min(1).max(6),
  ai_engine: z.enum(['gemini', 'claude', 'openai']),
});

// 使用
export async function POST(req: Request) {
  const body = await req.json();
  const validated = generateRequestSchema.parse(body); // 會自動拋錯
  // ...
}
```

---

## 10. 測試策略

### 10.1 單元測試

```typescript
// tests/lib/ai/retry.test.ts
import { retryAICall } from '@/lib/ai/retry';

describe('retryAICall', () => {
  it('should retry on failure', async () => {
    let attempts = 0;

    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error('Fail');
      return 'Success';
    };

    const result = await retryAICall(fn, 2);

    expect(result).toBe('Success');
    expect(attempts).toBe(3);
  });
});
```

### 10.2 API 測試

```typescript
// tests/api/generate.test.ts
describe('POST /api/generate', () => {
  it('should generate content successfully', async () => {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        article: 'Test article',
        template_ids: [testTemplateId],
        ai_engine: 'gemini',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.outputs).toHaveLength(1);
  });

  it('should reject when quota exceeded', async () => {
    // 先用盡配額
    await exhaustQuota(testUserId);

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${testToken}` },
      body: JSON.stringify({ /* ... */ }),
    });

    expect(response.status).toBe(429);
  });
});
```

### 10.3 E2E 測試（選用）

使用 Playwright 或 Cypress 進行關鍵流程測試：
- 登入 → 產出 → 複製
- 新增模板 → 測試模板
- 管理員邀請使用者 → 使用者註冊

---

## 11. 開發指南

### 11.1 本地開發環境設定

```bash
# 1. Clone 專案
git clone <repository-url>
cd content-rewriter

# 2. 安裝依賴
npm install

# 3. 複製環境變數範本
cp .env.example .env.local

# 4. 填寫環境變數
# 編輯 .env.local，填入 Supabase 和 AI API 金鑰

# 5. 啟動開發伺服器
npm run dev

# 6. 啟動 Supabase 本地環境（選用）
npx supabase start
```

### 11.2 專案結構

```
content-rewriter/
├── src/
│   ├── components/          # React 元件
│   │   ├── common/         # 共用元件
│   │   ├── workspace/      # 工作頁面元件
│   │   └── admin/          # 管理員頁面元件
│   ├── pages/              # 頁面元件
│   ├── lib/                # 工具函式
│   │   ├── ai/            # AI 整合
│   │   ├── supabase.ts    # Supabase client
│   │   └── apiClient.ts   # API client
│   ├── store/              # 狀態管理
│   ├── types/              # TypeScript 類型
│   └── App.tsx             # 主應用程式
├── api/                    # Vercel Serverless Functions
│   ├── generate.ts
│   ├── templates/
│   │   └── test.ts
│   └── ...
├── supabase/               # Supabase 設定
│   ├── migrations/         # 資料庫遷移檔
│   └── seed.sql           # 初始資料
├── tests/                  # 測試檔案
├── .env.example           # 環境變數範本
├── vercel.json            # Vercel 設定
├── package.json
└── README.md
```

---

## 12. 常見問題與解決方案

### Q1: AI API 回應逾時怎麼辦？

**問題**: Vercel Serverless Functions 預設逾時 10 秒，但 AI 可能需要更久

**解決方案**:
```json
// vercel.json
{
  "functions": {
    "api/generate.ts": {
      "maxDuration": 60  // 延長到 60 秒（需付費方案）
    }
  }
}
```

### Q2: 如何處理 AI API 的 Rate Limit？

**問題**: AI API 有調用頻率限制

**解決方案**:
1. 前端 60 秒防抖（已實作）
2. 後端檢查 usage_quota（已實作）
3. 未來可加入佇列系統（Upstash Redis Queue）

### Q3: Supabase RLS 太慢？

**問題**: 複雜的 RLS 政策可能影響查詢效能

**解決方案**:
1. 在後端使用 Service Role Key 繞過 RLS（需自行驗證權限）
2. 優化 RLS 政策，使用索引
3. 考慮將部分查詢移到後端處理

---

## 13. 併發處理與原子性更新

### 13.1 問題背景

當多個使用者同時發送請求時，可能發生 **race condition**，導致配額計算錯誤。

**錯誤範例**:
```
時間 T1: 請求 A 讀取 usage_count = 10
時間 T2: 請求 B 讀取 usage_count = 10
時間 T3: 請求 A 更新 usage_count = 11  ❌ 應該是 11
時間 T4: 請求 B 更新 usage_count = 11  ❌ 應該是 12（被覆蓋）
```

### 13.2 解決方案：PostgreSQL 原子函數

**Migration 007: `increment_usage_count`**

```sql
CREATE OR REPLACE FUNCTION increment_usage_count(
  p_user_id UUID,
  p_increment INTEGER
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  monthly_limit INTEGER,
  current_month TEXT,
  usage_count INTEGER,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  UPDATE usage_quota
  SET
    usage_count = usage_quota.usage_count + p_increment,  -- 原子性增加
    updated_at = NOW()
  WHERE usage_quota.user_id = p_user_id
  RETURNING
    usage_quota.id,
    usage_quota.user_id,
    usage_quota.monthly_limit,
    usage_quota.current_month,
    usage_quota.usage_count,
    usage_quota.updated_at;
END;
$$ LANGUAGE plpgsql;
```

**關鍵技術**:
- 使用 `UPDATE ... RETURNING` 確保讀取和更新在同一個交易中
- PostgreSQL 自動鎖定該筆資料，防止其他交易同時修改

### 13.3 API 整合

```typescript
// api/generate.ts (Lines 307-330)

// 原子性更新使用量配額
const { data: updatedQuota, error: updateQuotaError } = await supabaseAdmin
  .rpc('increment_usage_count', {
    p_user_id: user.id,
    p_increment: successCount
  })
  .single()

// 降級處理（Fallback）
if (updateQuotaError) {
  console.error('Failed to update quota:', updateQuotaError)
  const { data: fallbackQuota } = await supabaseAdmin
    .from('usage_quota')
    .update({
      usage_count: quota.usage_count + successCount,
      updated_at: now.toISOString(),
    })
    .eq('id', quota.id)
    .select()
    .single()
}
```

### 13.4 測試驗證

執行 `scripts/test-fixes.ts`:

```typescript
// 測試原子更新
const { data: before } = await supabase
  .from('usage_quota')
  .select('usage_count')
  .eq('user_id', userId)
  .single()

const { data: result } = await supabase
  .rpc('increment_usage_count', {
    p_user_id: userId,
    p_increment: 3
  })
  .single()

// 驗證：12 + 3 = 15 ✅
console.log(result.usage_count === before.usage_count + 3)  // true
```

---

## 14. Rate Limiting 實作

### 14.1 需求分析

防止使用者濫用 API，限制每分鐘請求次數。

**規則**:
- 每位使用者每分鐘最多 10 次請求
- 超過限制返回 `429 Too Many Requests`
- 提供 `retryAfter` 欄位告知重試時間

### 14.2 資料庫層級實作

**Migration 008: `check_rate_limit`**

```sql
-- 在 profiles 表新增欄位
ALTER TABLE public.profiles
ADD COLUMN last_request_at TIMESTAMPTZ,
ADD COLUMN request_count_minute INTEGER DEFAULT 0;

-- 創建 Rate Limit 檢查函數
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
  -- 取得當前分鐘的開始時間
  v_current_minute := date_trunc('minute', NOW());

  -- 取得使用者的最後請求時間和計數
  SELECT last_request_at, request_count_minute
  INTO v_last_request, v_count
  FROM profiles
  WHERE id = p_user_id;

  -- 如果是新的分鐘，重置計數
  IF v_last_request IS NULL OR date_trunc('minute', v_last_request) < v_current_minute THEN
    v_count := 0;
  END IF;

  -- 增加計數
  v_count := v_count + 1;

  -- 更新資料庫
  UPDATE profiles
  SET
    last_request_at = NOW(),
    request_count_minute = v_count
  WHERE id = p_user_id;

  -- 返回結果
  RETURN QUERY SELECT
    v_count <= p_max_requests AS allowed,
    v_count AS current_count,
    v_current_minute + INTERVAL '1 minute' AS reset_at;
END;
$$ LANGUAGE plpgsql;
```

### 14.3 API 整合

```typescript
// api/generate.ts (Lines 164-181)

const { data: rateLimitResult, error: rateLimitError } = await supabaseAdmin
  .rpc('check_rate_limit', {
    p_user_id: user.id,
    p_max_requests: 10
  })
  .single()

if (rateLimitError) {
  console.error('Rate limit check failed:', rateLimitError)
  // 降級處理：繼續執行（避免因 Rate Limit 功能異常而阻擋正常請求）
} else if (rateLimitResult && !rateLimitResult.allowed) {
  return res.status(429).json({
    error: 'Too many requests',
    message: `每分鐘最多 10 次請求，請稍後再試`,
    retryAfter: Math.ceil((new Date(rateLimitResult.reset_at).getTime() - Date.now()) / 1000)
  })
}
```

### 14.4 測試驗證

```typescript
// scripts/test-fixes.ts

// 清空計數
await supabase
  .from('profiles')
  .update({
    last_request_at: null,
    request_count_minute: 0
  })
  .eq('id', userId)

// 測試前 10 次請求應該成功
for (let i = 1; i <= 10; i++) {
  const { data } = await supabase
    .rpc('check_rate_limit', {
      p_user_id: userId,
      p_max_requests: 10
    })
    .single()

  console.log(`${i}/10: allowed=${data.allowed}`)  // true
}

// 第 11 次應該被拒絕
const { data: rejected } = await supabase
  .rpc('check_rate_limit', {
    p_user_id: userId,
    p_max_requests: 10
  })
  .single()

console.log(rejected.allowed)  // false ✅
```

---

## 15. 配額檢查順序優化

### 15.1 問題背景

**錯誤的流程**（舊版）:
```
1. 檢查配額（使用 template_ids.length）
2. 驗證模板是否存在
```

**問題**:
- 如果使用者選擇 5 個模板，但其中 3 個已被刪除
- 配額檢查會用 5 去檢查，但實際只需要用 2
- 可能錯誤地返回「配額不足」

### 15.2 正確流程

**Migration 後（新版）**:
```
1. 先驗證模板是否存在（取得實際可用的模板）
2. 使用實際模板數量檢查配額
3. 產出內容
4. 按成功數量扣除配額
```

### 15.3 程式碼實作

```typescript
// api/generate.ts (Lines 190-241)

// 3. 先取得並驗證模板（避免用不存在的模板數量檢查配額）
const { data: templates, error: templatesError } = await supabaseAdmin
  .from('templates')
  .select('*')
  .in('id', template_ids)
  .eq('user_id', user.id)

if (templatesError || !templates || templates.length === 0) {
  return res.status(400).json({ error: 'Invalid template IDs' })  // 先返回模板錯誤
}

// 4. 檢查使用量配額（使用實際模板數量）
const { data: quota } = await supabaseAdmin
  .from('usage_quota')
  .select('*')
  .eq('user_id', user.id)
  .single()

// 檢查配額限制（使用實際可用的模板數量）
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

### 15.4 測試方式

**手動測試**（在瀏覽器中）:

1. 選擇一個不存在的 `template_id`（隨便輸入一個假的 UUID）
2. 發送請求
3. **預期結果**: 返回 `Invalid template IDs`（而非配額錯誤）
4. **驗證**: 檢查配額沒有被錯誤扣除

---

## 16. 錯誤處理策略

### 16.1 錯誤分類

| 錯誤類型 | HTTP 狀態碼 | 處理方式 | 記錄等級 |
|---------|-----------|---------|---------|
| 認證失敗 | 401 | 返回錯誤，不記錄詳細資訊 | Info |
| 權限不足 | 403 | 返回錯誤，記錄使用者 ID | Warning |
| 資料驗證失敗 | 400 | 返回詳細錯誤訊息 | Info |
| 配額超限 | 429 | 返回剩餘配額資訊 | Info |
| AI API 失敗 | 500 | 記錄錯誤，返回通用訊息 | Error |
| 資料庫錯誤 | 500 | 記錄完整錯誤，返回通用訊息 | Critical |

### 16.2 錯誤回應格式

```typescript
// 標準錯誤回應
interface ErrorResponse {
  error: string;           // 錯誤類型（簡短）
  message?: string;        // 詳細訊息（選用）
  retryAfter?: number;     // 重試時間（Rate Limit 專用）
  usage?: {                // 配額資訊（Quota 專用）
    current: number;
    limit: number;
  };
}
```

### 16.3 錯誤處理實作

```typescript
// api/generate.ts (Lines 355-369)

try {
  // ... 主邏輯
} catch (error) {
  console.error('API Error:', error)

  const message = error instanceof Error ? error.message : 'Internal server error'

  // 根據錯誤訊息返回適當的狀態碼
  if (message.includes('authorization') || message.includes('token')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (message.includes('disabled') || message.includes('expired') || message.includes('not started')) {
    return res.status(403).json({ error: message })
  }

  // 預設返回 500
  return res.status(500).json({ error: message })
}
```

### 16.4 降級處理（Graceful Degradation）

當非關鍵功能失敗時，繼續執行主流程：

```typescript
// Rate Limit 檢查失敗 → 繼續執行
if (rateLimitError) {
  console.error('Rate limit check failed:', rateLimitError)
  // 不阻擋請求
}

// 儲存歷史失敗 → 不影響回應
if (historyError) {
  console.error('Failed to save history:', historyError)
  // 不影響回應，繼續執行
}

// 原子更新失敗 → 使用降級方式
if (updateQuotaError) {
  console.error('Failed to update quota:', updateQuotaError)
  // 嘗試降級到原來的方式
  const { data: fallbackQuota } = await supabaseAdmin
    .from('usage_quota')
    .update({ usage_count: quota.usage_count + successCount })
    .eq('id', quota.id)
    .select()
    .single()
}
```

---

## 17. 時區處理

### 17.1 問題背景

配額計算使用「月份」作為重置週期，必須確保所有使用者在同一時區下計算。

**錯誤做法**:
```typescript
const currentMonth = new Date().toLocaleString('en-US', { month: '2-digit', year: 'numeric' })
// ❌ 會因使用者所在時區不同而產生不同結果
```

### 17.2 正確做法：統一使用 UTC

```typescript
// api/generate.ts (Lines 213-214)

const now = new Date()
const currentMonth = now.toISOString().slice(0, 7)  // "YYYY-MM" (UTC)
```

**範例**:
```typescript
// 台灣時間 2025-10-01 00:30
// UTC 時間 2025-09-30 16:30
// currentMonth = "2025-09"  ✅ 正確（使用 UTC）

// 錯誤做法：
// currentMonth = "2025-10"  ❌ 錯誤（台灣時區提前一天）
```

### 17.3 重置邏輯

```typescript
// api/generate.ts (Lines 217-230)

if (quotaMonth !== currentMonth) {
  // 重置配額
  await supabaseAdmin
    .from('usage_quota')
    .update({
      current_month: currentMonth,
      usage_count: 0,
      updated_at: now.toISOString(),
    })
    .eq('id', quota.id)

  quota.usage_count = 0
  quota.current_month = currentMonth
}
```

---

## 18. 未來優化方向

### 短期（1-3 個月）
- [ ] 整合 Sentry 錯誤監控
- [ ] 新增 AI API 費用追蹤儀表板
- [ ] 優化資料庫查詢效能（新增索引）
- [ ] 實作完整的 E2E 測試

### 中期（3-6 個月）
- [ ] 支援批次處理（一次上傳多篇文章）
- [ ] 模板匯出/匯入功能
- [ ] Threads 排程發佈功能（Phase 2）
- [ ] 使用佇列系統控制 AI API 並發

### 長期（6-12 個月）
- [ ] 多語言支援
- [ ] 團隊協作功能
- [ ] 更多 AI 引擎整合
- [ ] 自訂字數限制（不只 Threads）

---

## 附錄

### A. 相關文件連結
- [需求文件](./REQUIREMENTS.md)
- [Supabase 官方文件](https://supabase.com/docs)
- [Vercel 文件](https://vercel.com/docs)
- [Gemini API 文件](https://ai.google.dev/docs)

### B. 聯絡資訊
- 技術支援: [待補充]
- 緊急聯絡: [待補充]

---

**文件結束**
