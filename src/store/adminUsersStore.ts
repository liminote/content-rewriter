import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  access_start_date: string | null
  access_end_date: string | null
  is_active: boolean
  note: string | null
  created_at: string
  updated_at: string
  // 邀請狀態（從 auth.users 判斷）
  invite_status: 'completed' | 'pending' | 'expired'
}

interface AdminUsersState {
  users: AdminUser[]
  loading: boolean
  error: string | null
  searchQuery: string
  statusFilter: 'all' | 'active' | 'inactive' | 'pending'

  // Actions
  fetchUsers: () => Promise<void>
  createUser: (data: {
    email: string
    name: string
    access_start_date: string | null
    access_end_date: string | null
    note: string | null
  }) => Promise<void>
  updateUser: (
    id: string,
    data: {
      name?: string
      access_start_date?: string | null
      access_end_date?: string | null
      note?: string | null
    }
  ) => Promise<void>
  toggleUserStatus: (id: string, is_active: boolean) => Promise<void>
  resendInvite: (email: string) => Promise<void>
  setSearchQuery: (query: string) => void
  setStatusFilter: (filter: 'all' | 'active' | 'inactive' | 'pending') => void
}

export const useAdminUsersStore = create<AdminUsersState>((set, get) => ({
  users: [],
  loading: false,
  error: null,
  searchQuery: '',
  statusFilter: 'all',

  fetchUsers: async () => {
    set({ loading: true, error: null })

    try {
      // 查詢所有使用者（從 profiles 表）
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // 查詢 auth.users 以取得邀請狀態
      // 注意：需要有 service role key 才能讀取 auth.users
      // 這裡先簡化，假設所有使用者都已完成邀請
      const users: AdminUser[] = (profiles || []).map((profile) => ({
        ...profile,
        invite_status: 'completed' as const, // TODO: 實作邀請狀態判斷
      }))

      set({ users, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  createUser: async (data) => {
    set({ loading: true, error: null })

    try {
      // 呼叫 Supabase Admin API 建立使用者
      // 這需要在後端實作，因為需要 service role key
      // 暫時使用 supabase.auth.admin API（僅在 service role 時可用）

      // 1. 建立 auth user（發送邀請信）
      const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
        data.email,
        {
          data: {
            name: data.name,
          },
        }
      )

      if (authError) throw authError

      // 2. 更新 profiles 表
      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: data.email,
          name: data.name,
          access_start_date: data.access_start_date,
          access_end_date: data.access_end_date,
          note: data.note,
          is_active: true,
          role: 'user',
        })

        if (profileError) throw profileError
      }

      // 重新載入使用者列表
      await get().fetchUsers()
      set({ loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  updateUser: async (id, data) => {
    set({ loading: true, error: null })

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      // 更新本地狀態
      const users = get().users.map((user) =>
        user.id === id ? { ...user, ...data } : user
      )
      set({ users, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  toggleUserStatus: async (id, is_active) => {
    set({ loading: true, error: null })

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      // 更新本地狀態
      const users = get().users.map((user) =>
        user.id === id ? { ...user, is_active } : user
      )
      set({ users, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  resendInvite: async (email) => {
    set({ loading: true, error: null })

    try {
      // 重新發送邀請信
      const { error } = await supabase.auth.admin.inviteUserByEmail(email)

      if (error) throw error

      set({ loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  setStatusFilter: (filter) => {
    set({ statusFilter: filter })
  },
}))
