import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  initialized: boolean

  // Actions
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  checkAuth: () => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: false,
  initialized: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        await get().fetchProfile(data.user.id)

        // 檢查使用者狀態
        const profile = get().profile
        if (profile) {
          // 檢查帳號是否啟用
          if (!profile.is_active) {
            await get().signOut()
            throw new Error('您的帳號已被停用，請聯繫管理員')
          }

          // Admin 不受使用期限限制
          if (profile.role !== 'admin') {
            const now = new Date()
            const startDate = profile.access_start_date ? new Date(profile.access_start_date) : null
            const endDate = profile.access_end_date ? new Date(profile.access_end_date) : null

            // 檢查使用期限
            if (startDate && now < startDate) {
              await get().signOut()
              throw new Error('您的帳號尚未開始使用，請聯繫管理員')
            }

            if (endDate && now > endDate) {
              await get().signOut()
              throw new Error('您的帳號使用期限已過，請聯繫管理員')
            }
          }
        }
      }

      set({ user: data.user, session: data.session })
    } catch (error) {
      console.error('登入失敗:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      set({ user: null, session: null, profile: null })
    } catch (error) {
      console.error('登出失敗:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  resetPassword: async (email: string) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
    } catch (error) {
      console.error('密碼重設失敗:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  updatePassword: async (newPassword: string) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error
    } catch (error) {
      console.error('更新密碼失敗:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  checkAuth: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) throw error

      if (session?.user) {
        await get().fetchProfile(session.user.id)
        set({ user: session.user, session })
      }
    } catch (error) {
      console.error('檢查認證狀態失敗:', error)
    } finally {
      set({ initialized: true })
    }
  },

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      set({ profile: data })
    } catch (error) {
      console.error('取得使用者資料失敗:', error)
      throw error
    }
  },
}))

// 初始化認證狀態
supabase.auth.onAuthStateChange((event, session) => {
  const store = useAuthStore.getState()

  if (event === 'SIGNED_IN' && session?.user) {
    store.fetchProfile(session.user.id).catch(console.error)
    useAuthStore.setState({ user: session.user, session })
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, session: null, profile: null })
  } else if (event === 'TOKEN_REFRESHED' && session) {
    useAuthStore.setState({ session })
  }
})
