// ============================================
// 使用者相關型別
// ============================================
export interface User {
  id: string
  email: string
}

export interface Profile {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  access_start_date: string | null
  access_end_date: string | null
  is_active: boolean
  note: string | null
  created_at: string
  updated_at: string
}

// ============================================
// 模板相關型別
// ============================================
export interface Template {
  id: string
  user_id: string
  name: string
  prompt: string
  order: number
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface DefaultTemplate {
  id: string
  name: string
  prompt: string
  order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================
// AI 產出相關型別
// ============================================
export type AIEngine = 'gemini' | 'claude' | 'openai'

export interface GenerateRequest {
  article: string
  template_ids: string[]
  ai_engine: AIEngine
}

export interface GenerateResponse {
  outputs: HistoryOutput[]
  usage: {
    current: number
    limit: number
  }
}

export interface TestTemplateRequest {
  template_id: string
  test_article: string
  ai_engine: AIEngine
}

export interface TestTemplateResponse {
  result: string
  error?: string
}

// ============================================
// 歷史記錄相關型別
// ============================================
export interface HistoryOutput {
  template_id: string
  template_name: string
  content: string
  status: 'success' | 'error'
  error_message?: string
  generated_at: string
}

export interface History {
  id: string
  user_id: string
  ai_engine: AIEngine
  outputs: HistoryOutput[]
  created_at: string
}

// ============================================
// 設定相關型別
// ============================================
export interface Settings {
  id: string
  user_id: string
  default_ai: AIEngine
  updated_at: string
}

// ============================================
// 使用量配額相關型別
// ============================================
export interface UsageQuota {
  id: string
  user_id: string
  monthly_limit: number
  current_month: string
  usage_count: number
  updated_at: string
}

// ============================================
// 使用記錄相關型別
// ============================================
export interface UsageLog {
  id: string
  user_id: string
  ai_engine: AIEngine
  template_count: number
  success_count: number
  error_count: number
  created_at: string
}

// ============================================
// 錯誤日誌相關型別
// ============================================
export interface ErrorLog {
  id: string
  user_id: string | null
  error_type: string
  error_message: string
  context: Record<string, any> | null
  created_at: string
}

// ============================================
// 管理員更新記錄相關型別
// ============================================
export interface AdminChangelog {
  id: string
  date: string
  event_type: string
  title: string
  content: string
  affected_scope: string | null
  created_by: string
  created_at: string
  updated_at: string
}
