import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'

export interface ScheduledPost {
  id: string
  user_id: string
  source_title: string
  content: string
  created_at: string
  updated_at: string
  publications: Publication[]
}

export interface Publication {
  id: string
  post_id: string
  user_id: string
  platform: 'threads' | 'facebook' | 'instagram'
  status: 'pending' | 'publishing' | 'published' | 'failed'
  scheduled_at: string | null
  published_at: string | null
  hashtags: string[]
  platform_post_id: string | null
  platform_post_url: string | null
  likes_count: number
  comments_count: number
  shares_count: number
  views_count: number
  error_message: string | null
  retry_count: number
  last_synced_at: string | null
  created_at: string
}

interface ScheduledPostsState {
  posts: ScheduledPost[]
  loading: boolean
  error: string | null

  // Actions
  fetchPosts: () => Promise<void>
  createPosts: (sourceTitle: string, outputs: Array<{ content: string; platform: 'threads' }>) => Promise<void>
  updatePublication: (publicationId: string, hashtags: string[]) => Promise<void>
  deletePost: (postId: string) => Promise<void>
  publishPost: (publicationId: string) => Promise<void>
  syncMetrics: (publicationId: string) => Promise<void>
}

export const useScheduledPostsStore = create<ScheduledPostsState>((set, get) => ({
  posts: [],
  loading: false,
  error: null,

  fetchPosts: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('未登入')

      const response = await fetch('/api/scheduled-posts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '取得排程貼文失敗')
      }

      const data = await response.json()
      set({ posts: data.posts, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  createPosts: async (sourceTitle: string, outputs: Array<{ content: string; platform: 'threads' }>) => {
    set({ loading: true, error: null })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('未登入')

      const response = await fetch('/api/scheduled-posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_title: sourceTitle,
          outputs,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '建立排程貼文失敗')
      }

      // 重新載入貼文列表
      await get().fetchPosts()
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  updatePublication: async (publicationId: string, hashtags: string[]) => {
    set({ error: null })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('未登入')

      const response = await fetch('/api/scheduled-posts', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publication_id: publicationId,
          hashtags,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '更新發佈記錄失敗')
      }

      // 更新本地狀態
      const data = await response.json()
      set(state => ({
        posts: state.posts.map(post => ({
          ...post,
          publications: post.publications.map(pub =>
            pub.id === publicationId ? data.publication : pub
          ),
        })),
      }))
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  deletePost: async (postId: string) => {
    set({ error: null })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('未登入')

      const response = await fetch(`/api/scheduled-posts?post_id=${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '刪除貼文失敗')
      }

      // 更新本地狀態
      set(state => ({
        posts: state.posts.filter(post => post.id !== postId),
      }))
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  publishPost: async (publicationId: string) => {
    set({ error: null })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('未登入')

      const response = await fetch('/api/threads/publish', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publication_id: publicationId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '發佈失敗')
      }

      // 更新發佈狀態為 publishing
      set(state => ({
        posts: state.posts.map(post => ({
          ...post,
          publications: post.publications.map(pub =>
            pub.id === publicationId
              ? { ...pub, status: 'publishing' as const }
              : pub
          ),
        })),
      }))

      // 3 秒後重新載入以取得最新狀態
      setTimeout(() => {
        get().fetchPosts()
      }, 3000)
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  syncMetrics: async (publicationId: string) => {
    set({ error: null })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('未登入')

      const response = await fetch('/api/threads/sync-metrics', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publication_id: publicationId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '同步互動數據失敗')
      }

      // 更新本地狀態
      const data = await response.json()
      set(state => ({
        posts: state.posts.map(post => ({
          ...post,
          publications: post.publications.map(pub =>
            pub.id === publicationId ? data.publication : pub
          ),
        })),
      }))
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },
}))
