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

const THREADS_APP_ID = process.env.THREADS_APP_ID!
const THREADS_APP_SECRET = process.env.THREADS_APP_SECRET!
const REDIRECT_URI = process.env.THREADS_REDIRECT_URI!
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code, state, error } = req.query

    // 處理使用者拒絕授權
    if (error) {
      return res.redirect(`${FRONTEND_URL}/settings?threads_auth=cancelled`)
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' })
    }

    // 解析 state 取得 user_id
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString())
    const userId = stateData.user_id

    // 交換 code 為 access token
    const tokenUrl = new URL('https://graph.threads.net/oauth/access_token')
    tokenUrl.searchParams.set('client_id', THREADS_APP_ID)
    tokenUrl.searchParams.set('client_secret', THREADS_APP_SECRET)
    tokenUrl.searchParams.set('grant_type', 'authorization_code')
    tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    tokenUrl.searchParams.set('code', code as string)

    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: 'POST',
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Threads token exchange failed:', errorData)
      return res.redirect(`${FRONTEND_URL}/settings?threads_auth=error`)
    }

    const tokenData = await tokenResponse.json()
    const { access_token, user_id: threads_user_id, expires_in } = tokenData

    // 計算 token 過期時間
    const expiresAt = new Date(Date.now() + expires_in * 1000)

    // 儲存到資料庫
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        threads_access_token: access_token,
        threads_user_id: threads_user_id,
        threads_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to save Threads token:', updateError)
      return res.redirect(`${FRONTEND_URL}/settings?threads_auth=error`)
    }

    // 成功，重導向到設定頁面
    return res.redirect(`${FRONTEND_URL}/settings?threads_auth=success`)
  } catch (error) {
    console.error('Threads OAuth callback error:', error)
    return res.redirect(`${FRONTEND_URL}/settings?threads_auth=error`)
  }
}
