import { VercelRequest } from '@vercel/node'
import { supabaseAdmin } from './supabase'

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  is_active: boolean
  access_start_date: string | null
  access_end_date: string | null
}

export async function authenticateRequest(req: VercelRequest): Promise<AuthenticatedUser> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.replace('Bearer ', '')

  // 驗證 JWT token
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    throw new Error('Invalid or expired token')
  }

  // 取得使用者 profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('User profile not found')
  }

  // 檢查帳號是否啟用
  if (!profile.is_active) {
    throw new Error('Account is disabled')
  }

  // Admin 不受期限限制
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
