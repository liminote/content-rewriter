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

interface PublishRequest {
  publication_id: string
}

/**
 * 發佈貼文到 Threads（兩步驟流程）
 */
async function publishToThreads(
  accessToken: string,
  threadsUserId: string,
  content: string,
  hashtags: string[]
): Promise<{ post_id: string; post_url: string }> {
  // 組合完整內容（包含 hashtags）
  const fullContent = hashtags.length > 0
    ? `${content}\n\n${hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}`
    : content

  // Step 1: 建立 container
  const createUrl = new URL(`https://graph.threads.net/v1.0/${threadsUserId}/threads`)
  createUrl.searchParams.set('media_type', 'TEXT')
  createUrl.searchParams.set('text', fullContent)
  createUrl.searchParams.set('access_token', accessToken)

  const createResponse = await fetch(createUrl.toString(), {
    method: 'POST',
  })

  if (!createResponse.ok) {
    const errorData = await createResponse.text()
    throw new Error(`Failed to create Threads container: ${errorData}`)
  }

  const createData = await createResponse.json()
  const containerId = createData.id

  // Step 2: 發佈 container
  const publishUrl = new URL(`https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`)
  publishUrl.searchParams.set('creation_id', containerId)
  publishUrl.searchParams.set('access_token', accessToken)

  const publishResponse = await fetch(publishUrl.toString(), {
    method: 'POST',
  })

  if (!publishResponse.ok) {
    const errorData = await publishResponse.text()
    throw new Error(`Failed to publish Threads post: ${errorData}`)
  }

  const publishData = await publishResponse.json()
  const postId = publishData.id

  // 組合貼文 URL
  const postUrl = `https://www.threads.net/@${threadsUserId}/post/${postId}`

  return { post_id: postId, post_url: postUrl }
}

/**
 * 重試邏輯
 */
async function publishWithRetry(
  publicationId: string,
  userId: string,
  accessToken: string,
  threadsUserId: string,
  content: string,
  hashtags: string[]
): Promise<void> {
  const MAX_RETRIES = 3
  const RETRY_DELAY = 5 * 60 * 1000 // 5 分鐘

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 更新狀態為 publishing
      await supabaseAdmin
        .from('post_publications')
        .update({
          status: 'publishing',
          retry_count: attempt,
        })
        .eq('id', publicationId)

      // 嘗試發佈
      const { post_id, post_url } = await publishToThreads(
        accessToken,
        threadsUserId,
        content,
        hashtags
      )

      // 成功：更新狀態
      await supabaseAdmin
        .from('post_publications')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          platform_post_id: post_id,
          platform_post_url: post_url,
          error_message: null,
        })
        .eq('id', publicationId)

      return // 成功，跳出
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (attempt === MAX_RETRIES) {
        // 最後一次失敗：標記為 failed
        await supabaseAdmin
          .from('post_publications')
          .update({
            status: 'failed',
            error_message: errorMessage,
            retry_count: attempt,
          })
          .eq('id', publicationId)

        throw error
      } else {
        // 還有重試機會：等待後重試
        console.log(`Publish attempt ${attempt + 1} failed, retrying in 5 minutes...`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      }
    }
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

    const { publication_id }: PublishRequest = req.body

    if (!publication_id) {
      return res.status(400).json({ error: 'Missing publication_id' })
    }

    // 取得發佈記錄和對應的貼文內容
    const { data: publication, error: pubError } = await supabaseAdmin
      .from('post_publications')
      .select(`
        *,
        post:scheduled_posts(content)
      `)
      .eq('id', publication_id)
      .eq('user_id', user.id)
      .single()

    if (pubError || !publication) {
      return res.status(404).json({ error: 'Publication not found' })
    }

    if (publication.platform !== 'threads') {
      return res.status(400).json({ error: 'Only Threads platform is supported' })
    }

    // 取得使用者的 Threads 授權
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('threads_access_token, threads_user_id, threads_token_expires_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return res.status(400).json({ error: 'User profile not found' })
    }

    if (!profile.threads_access_token || !profile.threads_user_id) {
      return res.status(400).json({ error: 'Threads account not connected' })
    }

    // 檢查 token 是否過期
    if (profile.threads_token_expires_at) {
      const expiresAt = new Date(profile.threads_token_expires_at)
      if (expiresAt < new Date()) {
        return res.status(400).json({ error: 'Threads token expired, please reconnect' })
      }
    }

    // 非同步執行發佈（含重試邏輯）
    publishWithRetry(
      publication_id,
      user.id,
      profile.threads_access_token,
      profile.threads_user_id,
      publication.post.content,
      publication.hashtags || []
    ).catch(error => {
      console.error('Publish with retry failed:', error)
    })

    // 立即回應（不等待發佈完成）
    return res.status(200).json({
      message: 'Publishing started',
      publication_id,
    })
  } catch (error) {
    console.error('Threads publish error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
