import { createClient } from '@supabase/supabase-js'

// Vercel 環境變數在前端和後端都可用，但 VITE_ 前綴的變數在後端也需要用相同名稱讀取
const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing environment variables:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceRoleKey,
    env: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
  })
  throw new Error('Missing Supabase environment variables')
}

// Service Role Client - 繞過 RLS，用於伺服器端操作
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
