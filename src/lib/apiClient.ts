import { supabase } from './supabase/client'
import { GenerateRequest, GenerateResponse, TestTemplateRequest, TestTemplateResponse } from '@/types'

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('未授權')
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || '請求失敗')
  }

  return response.json()
}

export const api = {
  // AI 產出
  generate: async (data: GenerateRequest): Promise<GenerateResponse> =>
    fetchWithAuth('/api/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 測試模板
  testTemplate: async (data: TestTemplateRequest): Promise<TestTemplateResponse> =>
    fetchWithAuth('/api/templates/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
