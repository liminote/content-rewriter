import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { UsageQuota } from '@/types'

interface UsageState {
  quota: UsageQuota | null
  loading: boolean

  // Actions
  fetchQuota: (userId: string) => Promise<void>
  checkQuotaLimit: () => boolean
  incrementUsage: () => Promise<void>
}

export const useUsageStore = create<UsageState>((set, get) => ({
  quota: null,
  loading: false,

  fetchQuota: async (userId: string) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('usage_quota')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error

      set({ quota: data })
    } catch (error) {
      console.error('取得使用量配額失敗:', error)
    } finally {
      set({ loading: false })
    }
  },

  checkQuotaLimit: () => {
    const { quota } = get()
    if (!quota) return false

    return quota.monthly_usage >= quota.monthly_limit
  },

  incrementUsage: async () => {
    const { quota } = get()
    if (!quota) throw new Error('未載入使用量配額')

    try {
      const { data, error } = await supabase
        .from('usage_quota')
        .update({
          monthly_usage: quota.monthly_usage + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quota.id)
        .select()
        .single()

      if (error) throw error

      set({ quota: data })
    } catch (error) {
      console.error('更新使用量失敗:', error)
      throw error
    }
  },
}))
