import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface SyncMetricsRequest {
  publication_id: string
}

/**
 * 從 Threads API 取得貼文互動數據
 */
async function fetchThreadsMetrics(
  accessToken: string,
  postId: string
): Promise<{
  likes: number
  replies: number
  reposts: number
  views: number
}> {
  const metricsUrl = new URL(`https://graph.threads.net/v1.0/${postId}`)
  metricsUrl.searchParams.set('fields', 'id,text,timestamp,media_type,media_url,permalink,owner,is_quote_post,like_count,replies_count,reposts_count,views')
  metricsUrl.searchParams.set('access_token', accessToken)

  const response = await fetch(metricsUrl.toString())

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Failed to fetch Threads metrics: ${errorData}`)
  }

  const data = await response.json()

  return {
    likes: data.like_count || 0,
    replies: data.replies_count || 0,
    reposts: data.reposts_count || 0,
    views: data.views || 0,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 驗證使用者
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const { publication_id }: SyncMetricsRequest = req.body

    if (!publication_id) {
      return res.status(400).json({ error: 'Missing publication_id' })
    }

    // 取得發佈記錄
    const { data: publication, error: pubError } = await supabaseAdmin
      .from('post_publications')
      .select('*')
      .eq('id', publication_id)
      .eq('user_id', user.id)
      .single()

    if (pubError || !publication) {
      return res.status(404).json({ error: 'Publication not found' })
    }

    if (publication.status !== 'published') {
      return res.status(400).json({ error: 'Publication is not published yet' })
    }

    if (!publication.platform_post_id) {
      return res.status(400).json({ error: 'Missing platform post ID' })
    }

    // 取得使用者的 Threads 授權
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('threads_access_token')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.threads_access_token) {
      return res.status(400).json({ error: 'Threads account not connected' })
    }

    // 從 Threads API 取得最新互動數據
    const metrics = await fetchThreadsMetrics(
      profile.threads_access_token,
      publication.platform_post_id
    )

    // 更新資料庫
    const { data: updatedPublication, error: updateError } = await supabaseAdmin
      .from('post_publications')
      .update({
        likes_count: metrics.likes,
        comments_count: metrics.replies,
        shares_count: metrics.reposts,
        views_count: metrics.views,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', publication_id)
      .select()
      .single()

    if (updateError) {
      throw new Error('Failed to update metrics')
    }

    return res.status(200).json({
      message: 'Metrics synced successfully',
      publication: updatedPublication,
    })
  } catch (error) {
    console.error('Sync metrics error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
