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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 讀取環境變數（在 handler 內讀取以確保取得最新值）
    const THREADS_APP_ID = process.env.THREADS_APP_ID
    const REDIRECT_URI = process.env.THREADS_REDIRECT_URI

    // 除錯：檢查環境變數
    if (!THREADS_APP_ID) {
      console.error('THREADS_APP_ID is not set')
      return res.status(500).json({ error: 'Server configuration error: THREADS_APP_ID not set' })
    }

    if (!REDIRECT_URI) {
      console.error('THREADS_REDIRECT_URI is not set')
      return res.status(500).json({ error: 'Server configuration error: THREADS_REDIRECT_URI not set' })
    }

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

    // 產生 state 參數（包含 user_id 以便 callback 時識別）
    const state = Buffer.from(JSON.stringify({
      user_id: user.id,
      timestamp: Date.now(),
    })).toString('base64')

    // 建立 Threads OAuth URL
    const authUrl = new URL('https://threads.net/oauth/authorize')
    authUrl.searchParams.set('client_id', THREADS_APP_ID)
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.set('scope', 'threads_basic,threads_content_publish,threads_manage_insights')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', state)

    return res.status(200).json({
      authorization_url: authUrl.toString(),
    })
  } catch (error) {
    console.error('Threads OAuth authorize error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
