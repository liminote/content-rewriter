import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'

export interface DefaultTemplate {
  id: string
  name: string
  prompt: string
  order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface DefaultTemplateState {
  templates: DefaultTemplate[]
  loading: boolean
  error: string | null

  // Actions
  fetchTemplates: () => Promise<void>
  createTemplate: (data: { name: string; prompt: string }) => Promise<void>
  updateTemplate: (id: string, data: { name?: string; prompt?: string }) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  toggleTemplateStatus: (id: string, is_active: boolean) => Promise<void>
  reorderTemplates: (templates: DefaultTemplate[]) => Promise<void>
}

export const useDefaultTemplateStore = create<DefaultTemplateState>((set, get) => ({
  templates: [],
  loading: false,
  error: null,

  fetchTemplates: async () => {
    set({ loading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('default_templates')
        .select('*')
        .order('order', { ascending: true })

      if (error) throw error

      set({ templates: data || [], loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  createTemplate: async (data) => {
    set({ loading: true, error: null })

    try {
      // 取得目前最大的 order 值
      const templates = get().templates
      const maxOrder = templates.length > 0 ? Math.max(...templates.map((t) => t.order)) : 0

      const { error } = await supabase.from('default_templates').insert({
        name: data.name,
        prompt: data.prompt,
        order: maxOrder + 1,
        is_active: true,
      })

      if (error) throw error

      // 重新載入模板列表
      await get().fetchTemplates()
      set({ loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  updateTemplate: async (id, data) => {
    set({ loading: true, error: null })

    try {
      const { error } = await supabase
        .from('default_templates')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      // 更新本地狀態
      const templates = get().templates.map((template) =>
        template.id === id ? { ...template, ...data } : template
      )
      set({ templates, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  deleteTemplate: async (id) => {
    set({ loading: true, error: null })

    try {
      const { error } = await supabase.from('default_templates').delete().eq('id', id)

      if (error) throw error

      // 移除本地狀態
      const templates = get().templates.filter((template) => template.id !== id)
      set({ templates, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  toggleTemplateStatus: async (id, is_active) => {
    set({ loading: true, error: null })

    try {
      const { error } = await supabase
        .from('default_templates')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      // 更新本地狀態
      const templates = get().templates.map((template) =>
        template.id === id ? { ...template, is_active } : template
      )
      set({ templates, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  reorderTemplates: async (templates) => {
    set({ loading: true, error: null })

    try {
      // 更新所有模板的 order
      const updates = templates.map((template, index) => ({
        id: template.id,
        order: index,
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('default_templates')
          .update({ order: update.order })
          .eq('id', update.id)

        if (error) throw error
      }

      // 更新本地狀態
      set({ templates, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
}))
