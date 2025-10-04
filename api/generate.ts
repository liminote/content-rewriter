import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ============================================
// Supabase Client Setup
// ============================================
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing environment variables:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceRoleKey,
  })
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// ============================================
// Types
// ============================================
type AIEngine = 'gemini' | 'claude' | 'openai'

interface AuthenticatedUser {
  id: string
  email: string
  role: string
  is_active: boolean
  access_start_date: string | null
  access_end_date: string | null
}

// ============================================
// Auth Helper
// ============================================
async function authenticateRequest(req: VercelRequest): Promise<AuthenticatedUser> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.replace('Bearer ', '')

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    throw new Error('Invalid or expired token')
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('User profile not found')
  }

  if (!profile.is_active) {
    throw new Error('Account is disabled')
  }

  if (profile.role !== 'admin') {
    const now = new Date()
    const startDate = profile.access_start_date ? new Date(profile.access_start_date) : null
    const endDate = profile.access_end_date ? new Date(profile.access_end_date) : null

    if (startDate && now < startDate) {
      throw new Error('Access not started yet')
    }

    if (endDate && now > endDate) {
      throw new Error('Access expired')
    }
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    is_active: profile.is_active,
    access_start_date: profile.access_start_date,
    access_end_date: profile.access_end_date,
  }
}

// ============================================
// AI Providers
// ============================================
async function generateContent({ prompt, article, engine }: { prompt: string; article: string; engine: AIEngine }): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  switch (engine) {
    case 'gemini':
      return generateWithGemini(prompt, article)
    case 'claude':
      throw new Error('Claude API not implemented yet')
    case 'openai':
      throw new Error('OpenAI API not implemented yet')
    default:
      throw new Error(`Unsupported AI engine: ${engine}`)
  }
}

async function generateWithGemini(prompt: string, article: string): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const fullPrompt = `${prompt}

【重要】請使用繁體中文回答，不要使用英文或簡體中文。

文章內容：
${article}`

  const result = await model.generateContent(fullPrompt)
  const response = await result.response
  const text = response.text()

  // Get token usage from response
  const usageMetadata = response.usageMetadata
  const inputTokens = usageMetadata?.promptTokenCount || 0
  const outputTokens = usageMetadata?.candidatesTokenCount || 0

  return { text, inputTokens, outputTokens }
}

interface GenerateRequest {
  article: string
  template_ids: string[]
  ai_engine: AIEngine
}

interface GenerateOutput {
  template_id: string
  template_name: string
  content: string
  status: 'success' | 'error'
  error_message?: string
  generated_at: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允許 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. 驗證使用者
    const user = await authenticateRequest(req)

    // 2. 取得請求參數
    const { article, template_ids, ai_engine }: GenerateRequest = req.body

    if (!article || !template_ids || template_ids.length === 0 || !ai_engine) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // 3. 檢查使用量配額
    const { data: quota, error: quotaError } = await supabaseAdmin
      .from('usage_quota')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (quotaError) {
      throw new Error('Failed to fetch usage quota')
    }

    // 檢查是否需要重置配額（每月 1 日重置）
    const now = new Date()
    const currentMonth = now.toISOString().slice(0, 7) // YYYY-MM
    const quotaMonth = quota.current_month

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

    // 檢查配額限制
    if (quota.usage_count >= quota.monthly_limit) {
      return res.status(429).json({
        error: 'Monthly quota exceeded',
        usage: {
          current: quota.usage_count,
          limit: quota.monthly_limit,
        },
      })
    }

    // 4. 取得模板資訊
    const { data: templates, error: templatesError } = await supabaseAdmin
      .from('templates')
      .select('*')
      .in('id', template_ids)
      .eq('user_id', user.id)

    if (templatesError || !templates || templates.length === 0) {
      return res.status(400).json({ error: 'Invalid template IDs' })
    }

    // 5. 依序產出各模板內容
    const outputs: GenerateOutput[] = []
    const generatedAt = now.toISOString()
    let totalInputTokens = 0
    let totalOutputTokens = 0

    for (const template of templates) {
      try {
        const result = await generateContent({
          prompt: template.prompt,
          article,
          engine: ai_engine,
        })

        totalInputTokens += result.inputTokens
        totalOutputTokens += result.outputTokens

        outputs.push({
          template_id: template.id,
          template_name: template.name,
          content: result.text,
          status: 'success',
          generated_at: generatedAt,
        })
      } catch (error) {
        console.error(`Failed to generate for template ${template.id}:`, error)
        outputs.push({
          template_id: template.id,
          template_name: template.name,
          content: '',
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Generation failed',
          generated_at: generatedAt,
        })
      }
    }

    // 6. 儲存到 history 表
    const { error: historyError } = await supabaseAdmin
      .from('history')
      .insert({
        user_id: user.id,
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

    if (historyError) {
      console.error('Failed to save history:', historyError)
      // 不影響回應，繼續執行
    }

    // 7. 計算成功和失敗數量
    const successCount = outputs.filter(o => o.status === 'success').length
    const errorCount = outputs.filter(o => o.status === 'error').length

    // 8. 更新使用量配額（按成功產出的模板數量計算）
    const { data: updatedQuota, error: updateQuotaError } = await supabaseAdmin
      .from('usage_quota')
      .update({
        usage_count: quota.usage_count + successCount,
        updated_at: now.toISOString(),
      })
      .eq('id', quota.id)
      .select()
      .single()

    if (updateQuotaError) {
      console.error('Failed to update quota:', updateQuotaError)
    }

    // 9. 記錄到 usage_logs 表
    await supabaseAdmin
      .from('usage_logs')
      .insert({
        user_id: user.id,
        ai_engine,
        template_count: template_ids.length,
        success_count: successCount,
        error_count: errorCount,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        total_tokens: totalInputTokens + totalOutputTokens,
        created_at: generatedAt,
      })

    // 10. 返回結果
    return res.status(200).json({
      outputs,
      usage: {
        current: updatedQuota?.usage_count || quota.usage_count + successCount,
        limit: quota.monthly_limit,
      },
    })
  } catch (error) {
    console.error('API Error:', error)

    const message = error instanceof Error ? error.message : 'Internal server error'

    if (message.includes('authorization') || message.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (message.includes('disabled') || message.includes('expired') || message.includes('not started')) {
      return res.status(403).json({ error: message })
    }

    return res.status(500).json({ error: message })
  }
}
