import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'

export interface Template {
  id: string
  user_id: string
  name: string
  prompt: string
  order: number
  is_default: boolean
  created_at: string
  updated_at: string
}

interface TemplateState {
  templates: Template[]
  loading: boolean
  error: string | null

  fetchTemplates: (userId: string) => Promise<void>
  createTemplate: (userId: string, data: { name: string; prompt: string }) => Promise<void>
  updateTemplate: (id: string, data: { name?: string; prompt?: string }) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  reorderTemplates: (templates: Template[]) => Promise<void>
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  loading: false,
  error: null,

  fetchTemplates: async (userId: string) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true })

      if (error) throw error
      set({ templates: data || [], loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  createTemplate: async (userId: string, data: { name: string; prompt: string }) => {
    set({ loading: true, error: null })
    try {
      const { templates } = get()
      const maxTemplates = parseInt(import.meta.env.VITE_MAX_TEMPLATES || '6')

      if (templates.length >= maxTemplates) {
        throw new Error(`模板數量已達上限（${maxTemplates} 個）`)
      }

      // 獲取當前最大的 order 值
      const maxOrder = templates.length > 0
        ? Math.max(...templates.map(t => t.order))
        : 0

      const { data: newTemplate, error } = await supabase
        .from('templates')
        .insert({
          user_id: userId,
          name: data.name,
          prompt: data.prompt,
          order: maxOrder + 1,
          is_default: false,
        })
        .select()
        .single()

      if (error) throw error
      set({ templates: [...templates, newTemplate], loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  updateTemplate: async (id: string, data: { name?: string; prompt?: string }) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('templates')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      const { templates } = get()
      const updatedTemplates = templates.map(t =>
        t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t
      )
      set({ templates: updatedTemplates, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  deleteTemplate: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id)

      if (error) throw error

      const { templates } = get()
      const updatedTemplates = templates.filter(t => t.id !== id)
      set({ templates: updatedTemplates, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  reorderTemplates: async (reorderedTemplates: Template[]) => {
    set({ loading: true, error: null })
    try {
      // 更新每個模板的 order
      const updates = reorderedTemplates.map((template, index) =>
        supabase
          .from('templates')
          .update({ order: index + 1 })
          .eq('id', template.id)
      )

      await Promise.all(updates)

      const updatedTemplates = reorderedTemplates.map((t, index) => ({
        ...t,
        order: index + 1,
      }))
      set({ templates: updatedTemplates, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
}))
