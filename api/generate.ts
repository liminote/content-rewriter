import { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateRequest } from './lib/auth'
import { supabaseAdmin } from './lib/supabase'
import { generateContent, AIEngine } from './lib/ai-providers'

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
          monthly_usage: 0,
          updated_at: now.toISOString(),
        })
        .eq('id', quota.id)

      quota.monthly_usage = 0
      quota.current_month = currentMonth
    }

    // 檢查配額限制
    if (quota.monthly_usage >= quota.monthly_limit) {
      return res.status(429).json({
        error: 'Monthly quota exceeded',
        usage: {
          current: quota.monthly_usage,
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

    for (const template of templates) {
      try {
        const content = await generateContent({
          prompt: template.prompt,
          article,
          engine: ai_engine,
        })

        outputs.push({
          template_id: template.id,
          template_name: template.name,
          content,
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

    // 7. 更新使用量配額
    const { data: updatedQuota, error: updateQuotaError } = await supabaseAdmin
      .from('usage_quota')
      .update({
        monthly_usage: quota.monthly_usage + 1,
        updated_at: now.toISOString(),
      })
      .eq('id', quota.id)
      .select()
      .single()

    if (updateQuotaError) {
      console.error('Failed to update quota:', updateQuotaError)
    }

    // 8. 記錄到 usage_logs 表
    await supabaseAdmin
      .from('usage_logs')
      .insert({
        user_id: user.id,
        ai_engine,
        template_count: template_ids.length,
        success_count: outputs.filter(o => o.status === 'success').length,
        created_at: generatedAt,
      })

    // 9. 返回結果
    return res.status(200).json({
      outputs,
      usage: {
        current: updatedQuota?.monthly_usage || quota.monthly_usage + 1,
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
