import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'

export interface DashboardStats {
  // 使用者統計
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  pendingUsers: number

  // 產出統計
  todayGenerations: number
  weekGenerations: number
  monthGenerations: number

  // AI 引擎統計
  aiEngineStats: {
    gemini: number
    claude: number
    openai: number
  }

  // 使用者排行
  topUsers: Array<{
    user_id: string
    user_name: string
    usage_count: number
  }>

  // Token 使用統計
  tokenUsage: {
    gemini: { input: number; output: number; total: number }
    claude: { input: number; output: number; total: number }
    openai: { input: number; output: number; total: number }
    total: { input: number; output: number; total: number }
  }
}

export interface ErrorLog {
  id: string
  user_id: string | null
  user_name: string | null
  error_type: string
  error_message: string
  context: any
  created_at: string
}

export interface RecentActivity {
  recentLogins: Array<{
    user_id: string
    user_name: string
    logged_in_at: string
  }>
  recentUsers: Array<{
    user_id: string
    user_name: string
    email: string
    created_at: string
  }>
}

interface AdminDashboardState {
  stats: DashboardStats | null
  errorLogs: ErrorLog[]
  recentActivity: RecentActivity | null
  loading: boolean
  error: string | null

  // Actions
  fetchStats: () => Promise<void>
  fetchErrorLogs: (limit?: number) => Promise<void>
  fetchRecentActivity: () => Promise<void>
  refreshAll: () => Promise<void>
}

export const useAdminDashboardStore = create<AdminDashboardState>((set, get) => ({
  stats: null,
  errorLogs: [],
  recentActivity: null,
  loading: false,
  error: null,

  fetchStats: async () => {
    set({ loading: true, error: null })

    try {
      // 1. 使用者統計
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('is_active')

      if (profilesError) throw profilesError

      const totalUsers = profiles?.length || 0
      const activeUsers = profiles?.filter((p) => p.is_active).length || 0
      const inactiveUsers = totalUsers - activeUsers
      const pendingUsers = 0 // TODO: 實作邀請狀態判斷

      // 2. 產出統計
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      weekAgo.setHours(0, 0, 0, 0)

      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const { data: todayLogs, error: todayError } = await supabase
        .from('usage_logs')
        .select('success_count')
        .gte('created_at', today.toISOString())

      if (todayError) throw todayError

      const { data: weekLogs, error: weekError } = await supabase
        .from('usage_logs')
        .select('success_count')
        .gte('created_at', weekAgo.toISOString())

      if (weekError) throw weekError

      const { data: monthLogs, error: monthError } = await supabase
        .from('usage_logs')
        .select('ai_engine, success_count, input_tokens, output_tokens, total_tokens')
        .gte('created_at', monthStart.toISOString())

      if (monthError) throw monthError

      const todayGenerations = todayLogs?.reduce((sum, log) => sum + (log.success_count || 0), 0) || 0
      const weekGenerations = weekLogs?.reduce((sum, log) => sum + (log.success_count || 0), 0) || 0
      const monthGenerations = monthLogs?.reduce((sum, log) => sum + (log.success_count || 0), 0) || 0

      // 3. AI 引擎統計
      const aiEngineStats = {
        gemini: monthLogs?.filter((log) => log.ai_engine === 'gemini').reduce((sum, log) => sum + (log.success_count || 0), 0) || 0,
        claude: monthLogs?.filter((log) => log.ai_engine === 'claude').reduce((sum, log) => sum + (log.success_count || 0), 0) || 0,
        openai: monthLogs?.filter((log) => log.ai_engine === 'openai').reduce((sum, log) => sum + (log.success_count || 0), 0) || 0,
      }

      // 4. 使用者排行（本月）
      const { data: quotaData, error: quotaError } = await supabase
        .from('usage_quota')
        .select('user_id, usage_count, profiles(name)')
        .eq('current_month', `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
        .order('usage_count', { ascending: false })
        .limit(10)

      if (quotaError) throw quotaError

      const topUsers = (quotaData || []).map((item: any) => ({
        user_id: item.user_id,
        user_name: item.profiles?.name || '未知',
        usage_count: item.usage_count || 0,
      }))

      // 5. Token 使用統計
      const tokenUsage = {
        gemini: {
          input: monthLogs?.filter((log) => log.ai_engine === 'gemini').reduce((sum, log) => sum + (log.input_tokens || 0), 0) || 0,
          output: monthLogs?.filter((log) => log.ai_engine === 'gemini').reduce((sum, log) => sum + (log.output_tokens || 0), 0) || 0,
          total: monthLogs?.filter((log) => log.ai_engine === 'gemini').reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0,
        },
        claude: {
          input: monthLogs?.filter((log) => log.ai_engine === 'claude').reduce((sum, log) => sum + (log.input_tokens || 0), 0) || 0,
          output: monthLogs?.filter((log) => log.ai_engine === 'claude').reduce((sum, log) => sum + (log.output_tokens || 0), 0) || 0,
          total: monthLogs?.filter((log) => log.ai_engine === 'claude').reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0,
        },
        openai: {
          input: monthLogs?.filter((log) => log.ai_engine === 'openai').reduce((sum, log) => sum + (log.input_tokens || 0), 0) || 0,
          output: monthLogs?.filter((log) => log.ai_engine === 'openai').reduce((sum, log) => sum + (log.output_tokens || 0), 0) || 0,
          total: monthLogs?.filter((log) => log.ai_engine === 'openai').reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0,
        },
        total: {
          input: monthLogs?.reduce((sum, log) => sum + (log.input_tokens || 0), 0) || 0,
          output: monthLogs?.reduce((sum, log) => sum + (log.output_tokens || 0), 0) || 0,
          total: monthLogs?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0,
        },
      }

      const stats: DashboardStats = {
        totalUsers,
        activeUsers,
        inactiveUsers,
        pendingUsers,
        todayGenerations,
        weekGenerations,
        monthGenerations,
        aiEngineStats,
        topUsers,
        tokenUsage,
      }

      set({ stats, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  fetchErrorLogs: async (limit = 20) => {
    set({ loading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      const errorLogs: ErrorLog[] = (data || []).map((log: any) => ({
        id: log.id,
        user_id: log.user_id,
        user_name: log.profiles?.name || null,
        error_type: log.error_type,
        error_message: log.error_message,
        context: log.context,
        created_at: log.created_at,
      }))

      set({ errorLogs, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  fetchRecentActivity: async () => {
    set({ loading: true, error: null })

    try {
      // 最近登入（這需要記錄登入時間，暫時用建立時間代替）
      const { data: recentUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (usersError) throw usersError

      const recentActivity: RecentActivity = {
        recentLogins: [], // TODO: 實作登入記錄
        recentUsers: (recentUsers || []).map((user) => ({
          user_id: user.id,
          user_name: user.name,
          email: user.email,
          created_at: user.created_at,
        })),
      }

      set({ recentActivity, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchStats(),
      get().fetchErrorLogs(),
      get().fetchRecentActivity(),
    ])
  },
}))
