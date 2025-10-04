import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { History } from '@/types'

interface HistoryState {
  histories: History[]
  loading: boolean
  error: string | null

  // Actions
  fetchHistories: () => Promise<void>
  deleteHistory: (id: string) => Promise<void>
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  histories: [],
  loading: false,
  error: null,

  fetchHistories: async () => {
    set({ loading: true, error: null })

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('未登入')
      }

      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      set({ histories: data || [], loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  deleteHistory: async (id: string) => {
    try {
      const { error } = await supabase
        .from('history')
        .delete()
        .eq('id', id)

      if (error) throw error

      // 刪除成功後，從本地狀態移除
      const histories = get().histories.filter(h => h.id !== id)
      set({ histories })
    } catch (error: any) {
      set({ error: error.message })
    }
  },
}))
