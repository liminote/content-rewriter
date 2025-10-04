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

interface CreatePostRequest {
  source_title: string
  outputs: Array<{
    content: string
    platform: 'threads'
  }>
}

interface UpdatePostRequest {
  publication_id: string
  hashtags?: string[]
}

async function authenticateRequest(req: VercelRequest) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized')
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    throw new Error('Invalid token')
  }

  return user
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await authenticateRequest(req)

    switch (req.method) {
      case 'GET':
        return handleGet(user.id, res)
      case 'POST':
        return handlePost(user.id, req.body, res)
      case 'PUT':
        return handlePut(user.id, req.body, res)
      case 'DELETE':
        return handleDelete(user.id, req.query, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Scheduled posts API error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'

    if (message === 'Unauthorized' || message === 'Invalid token') {
      return res.status(401).json({ error: message })
    }

    return res.status(500).json({ error: message })
  }
}

/**
 * GET: 取得使用者的排程貼文（含發佈記錄）
 */
async function handleGet(userId: string, res: VercelResponse) {
  const { data: posts, error } = await supabaseAdmin
    .from('scheduled_posts')
    .select(`
      *,
      publications:post_publications(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('Failed to fetch scheduled posts')
  }

  return res.status(200).json({ posts })
}

/**
 * POST: 建立新的排程貼文（從工作區送來的多個 outputs）
 */
async function handlePost(userId: string, body: CreatePostRequest, res: VercelResponse) {
  const { source_title, outputs } = body

  if (!source_title || !outputs || outputs.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // 為每個 output 建立獨立的貼文
  const createdPosts = []

  for (const output of outputs) {
    // 1. 建立 scheduled_post
    const { data: post, error: postError } = await supabaseAdmin
      .from('scheduled_posts')
      .insert({
        user_id: userId,
        source_title,
        content: output.content,
      })
      .select()
      .single()

    if (postError || !post) {
      console.error('Failed to create scheduled post:', postError)
      continue
    }

    // 2. 建立對應的 publication（預設為 Threads，status 為 pending）
    const { data: publication, error: pubError } = await supabaseAdmin
      .from('post_publications')
      .insert({
        post_id: post.id,
        user_id: userId,
        platform: output.platform,
        status: 'pending',
      })
      .select()
      .single()

    if (pubError) {
      console.error('Failed to create publication:', pubError)
      // 清除已建立的 post
      await supabaseAdmin.from('scheduled_posts').delete().eq('id', post.id)
      continue
    }

    createdPosts.push({
      ...post,
      publications: [publication],
    })
  }

  return res.status(201).json({
    message: `Created ${createdPosts.length} scheduled posts`,
    posts: createdPosts,
  })
}

/**
 * PUT: 更新發佈記錄（主要用於更新 hashtags）
 */
async function handlePut(userId: string, body: UpdatePostRequest, res: VercelResponse) {
  const { publication_id, hashtags } = body

  if (!publication_id) {
    return res.status(400).json({ error: 'Missing publication_id' })
  }

  const updates: any = {}
  if (hashtags !== undefined) {
    updates.hashtags = hashtags
  }

  const { data: publication, error } = await supabaseAdmin
    .from('post_publications')
    .update(updates)
    .eq('id', publication_id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error('Failed to update publication')
  }

  return res.status(200).json({ publication })
}

/**
 * DELETE: 刪除排程貼文
 */
async function handleDelete(userId: string, query: any, res: VercelResponse) {
  const { post_id } = query

  if (!post_id) {
    return res.status(400).json({ error: 'Missing post_id' })
  }

  // 刪除 scheduled_post（會 cascade 刪除對應的 publications）
  const { error } = await supabaseAdmin
    .from('scheduled_posts')
    .delete()
    .eq('id', post_id)
    .eq('user_id', userId)

  if (error) {
    throw new Error('Failed to delete scheduled post')
  }

  return res.status(200).json({ message: 'Post deleted successfully' })
}
