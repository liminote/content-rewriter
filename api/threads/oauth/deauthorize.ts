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

/**
 * Threads Deauthorize Callback
 * 當用戶解除授權時，Meta 會呼叫此 endpoint
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Meta 會傳送 signed_request 參數
    const { signed_request } = req.body || req.query

    if (!signed_request) {
      return res.status(400).json({ error: 'Missing signed_request' })
    }

    // 解析 signed_request (簡化版本，實際應該要驗證簽名)
    const [encodedSig, payload] = signed_request.split('.')
    const data = JSON.parse(Buffer.from(payload, 'base64').toString())

    const userId = data.user_id

    if (userId) {
      // 清除該用戶的 Threads 授權資訊
      await supabaseAdmin
        .from('profiles')
        .update({
          threads_access_token: null,
          threads_user_id: null,
          threads_token_expires_at: null,
        })
        .eq('threads_user_id', userId)

      console.log(`Threads authorization revoked for user: ${userId}`)
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Deauthorize callback error:', error)
    return res.status(200).json({ success: true }) // 還是回傳 200 給 Meta
  }
}
