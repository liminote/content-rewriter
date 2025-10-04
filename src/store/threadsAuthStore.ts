import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'

interface ThreadsAuthState {
  isConnected: boolean
  threadsUserId: string | null
  tokenExpiresAt: string | null
  loading: boolean
  error: string | null

  // Actions
  checkConnection: () => Promise<void>
  startAuthorization: () => Promise<void>
  disconnect: () => Promise<void>
}

export const useThreadsAuthStore = create<ThreadsAuthState>((set) => ({
  isConnected: false,
  threadsUserId: null,
  tokenExpiresAt: null,
  loading: false,
  error: null,

  checkConnection: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未登入')

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('threads_user_id, threads_token_expires_at')
        .eq('id', user.id)
        .single()

      if (error) throw error

      const isConnected = !!(profile?.threads_user_id)
      const tokenExpiresAt = profile?.threads_token_expires_at || null

      // 檢查 token 是否過期
      let isExpired = false
      if (tokenExpiresAt) {
        isExpired = new Date(tokenExpiresAt) < new Date()
      }

      set({
        isConnected: isConnected && !isExpired,
        threadsUserId: profile?.threads_user_id || null,
        tokenExpiresAt,
        loading: false,
      })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  startAuthorization: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('未登入')

      // 呼叫後端 API 取得授權 URL
      const response = await fetch('/api/threads/oauth/authorize', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '取得授權 URL 失敗')
      }

      const data = await response.json()

      // 導向到 Threads 授權頁面
      window.location.href = data.authorization_url
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  disconnect: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未登入')

      const { error } = await supabase
        .from('profiles')
        .update({
          threads_access_token: null,
          threads_user_id: null,
          threads_token_expires_at: null,
        })
        .eq('id', user.id)

      if (error) throw error

      set({
        isConnected: false,
        threadsUserId: null,
        tokenExpiresAt: null,
        loading: false,
      })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
}))
