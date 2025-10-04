import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { useAuthStore } from '@/store/authStore'
import { useUsageStore } from '@/store/usageStore'
import { supabase } from '@/lib/supabase/client'
import { api } from '@/lib/apiClient'
import type { Template, AIEngine, HistoryOutput } from '@/types'

export function WorkspacePage() {
  const { user } = useAuthStore()
  const { quota, fetchQuota, checkQuotaLimit } = useUsageStore()

  // 狀態管理
  const [article, setArticle] = useState('')
  const [selectedAI, setSelectedAI] = useState<AIEngine>('gemini')
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [outputs, setOutputs] = useState<HistoryOutput[]>([])
  const [editableOutputs, setEditableOutputs] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  // 載入使用者模板和配額
  useEffect(() => {
    if (user) {
      fetchTemplates()
      fetchUserSettings()
      fetchQuota(user.id)
    }
  }, [user, fetchQuota])

  const fetchTemplates = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })

      if (error) throw error

      setTemplates(data || [])
      // 預設全部勾選
      setSelectedTemplates(data?.map(t => t.id) || [])
    } catch (error) {
      console.error('載入模板失敗:', error)
    }
  }

  const fetchUserSettings = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('preferred_ai_engine')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (data?.preferred_ai_engine) {
        setSelectedAI(data.preferred_ai_engine as AIEngine)
      }
    } catch (error) {
      console.error('載入設定失敗:', error)
    }
  }

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    )
  }

  const handleGenerate = async () => {
    if (!article.trim()) {
      setError('請輸入文章內容')
      return
    }

    if (selectedTemplates.length === 0) {
      setError('請至少選擇一個模板')
      return
    }

    // 檢查使用量配額
    if (checkQuotaLimit()) {
      setError(`本月產出次數已達上限（${quota?.monthly_usage}/${quota?.monthly_limit}），請聯絡管理員或等待下月重置`)
      return
    }

    setLoading(true)
    setError('')
    setOutputs([])

    try {
      const response = await api.generate({
        article,
        template_ids: selectedTemplates,
        ai_engine: selectedAI,
      })

      setOutputs(response.outputs)

      // 初始化可編輯內容
      const editableContent: Record<string, string> = {}
      response.outputs.forEach(output => {
        editableContent[output.template_id] = output.content
      })
      setEditableOutputs(editableContent)

      // 更新使用量
      if (user) {
        await fetchQuota(user.id)
      }

      // 啟動倒數計時（60秒）
      setCooldown(60)
      const timer = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      console.error('產出失敗:', err)
      setError(err instanceof Error ? err.message : '產出失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setArticle('')
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* 頁面標題與使用量 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-800">工作區</h1>
            <p className="mt-2 text-sm text-slate-600">
              將長文章改寫成適合 Threads 的短貼文
            </p>
          </div>
          {quota && (
            <div className="text-right bg-white/30 backdrop-blur-xl border border-white/20 rounded-2xl px-6 py-2 shadow-lg">
              <p className="text-sm text-slate-500">本月已使用</p>
              <p className="text-2xl font-bold text-indigo-800">
                {quota.monthly_usage || 0} / {quota.monthly_limit}
              </p>
              <p className="text-xs text-slate-400 mt-1">次</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：輸入區 */}
          <div className="space-y-6">
            {/* 文章輸入框 */}
            <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
              <label className="block text-sm font-medium text-indigo-800 mb-2">
                文章內容
              </label>
              <textarea
                value={article}
                onChange={(e) => setArticle(e.target.value)}
                placeholder="在此貼上您的文章內容..."
                rows={12}
                className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent resize-none placeholder-indigo-400 hover:bg-white/50 transition"
              />
              <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                <span>{article.length} 字元</span>
              </div>
            </div>

            {/* AI 引擎選擇 */}
            <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
              <label className="block text-sm font-medium text-indigo-800 mb-2">
                AI 引擎
              </label>
              <select
                value={selectedAI}
                onChange={(e) => setSelectedAI(e.target.value as AIEngine)}
                className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition"
              >
                <option value="gemini">Gemini</option>
                <option value="claude">Claude</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>

            {/* 模板選擇 */}
            <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
              <label className="block text-sm font-medium text-indigo-800 mb-3">
                選擇模板
              </label>
              {templates.length === 0 ? (
                <p className="text-sm text-slate-500">尚未建立模板</p>
              ) : (
                <div className="space-y-2">
                  {templates.map(template => (
                    <label
                      key={template.id}
                      className="flex items-center p-3 rounded-2xl hover:bg-white/40 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTemplates.includes(template.id)}
                        onChange={() => handleTemplateToggle(template.id)}
                        className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-white/30 rounded"
                      />
                      <span className="ml-3 text-sm text-slate-700">
                        {template.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={loading || cooldown > 0}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-6 py-3 rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium"
              >
                {cooldown > 0 ? `請稍候 ${cooldown} 秒` : '產出'}
              </button>
              <button
                onClick={handleClear}
                disabled={loading}
                className="px-6 py-3 bg-white/40 backdrop-blur-sm text-indigo-700 rounded-2xl hover:bg-white/50 transition border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                清除
              </button>
            </div>
          </div>

          {/* 右側：產出結果 */}
          <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
            <h2 className="text-lg font-medium text-indigo-800 mb-4">產出結果</h2>

            {/* 錯誤訊息 */}
            {error && (
              <div className="mb-4 bg-red-50/50 backdrop-blur-sm border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                {error}
              </div>
            )}

            {/* Loading 狀態 */}
            {loading && (
              <div className="flex flex-col items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-slate-600">AI 正在為您產出 {selectedTemplates.length} 個版本的貼文</p>
                <p className="text-sm text-slate-400 mt-2">預計需要 30-60 秒...</p>
              </div>
            )}

            {/* 產出結果 */}
            {!loading && outputs.length > 0 && (
              <div className="space-y-4">
                {outputs.map((output) => (
                  <div
                    key={output.template_id}
                    className={`border rounded-2xl p-4 ${
                      output.status === 'error'
                        ? 'border-red-200 bg-red-50/50 backdrop-blur-sm'
                        : 'border-white/30 bg-white/40 backdrop-blur-sm'
                    }`}
                  >
                    <div className="mb-3">
                      <h3 className="font-medium text-indigo-800">
                        {output.template_name}
                      </h3>
                    </div>

                    {output.status === 'success' ? (
                      <>
                        <textarea
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'auto'
                              el.style.height = el.scrollHeight + 'px'
                            }
                          }}
                          value={editableOutputs[output.template_id] || output.content}
                          onChange={(e) => {
                            setEditableOutputs(prev => ({
                              ...prev,
                              [output.template_id]: e.target.value
                            }))
                          }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement
                            target.style.height = 'auto'
                            target.style.height = target.scrollHeight + 'px'
                          }}
                          className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent resize-none text-sm text-slate-700 overflow-hidden"
                        />
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm text-slate-500">
                            {(editableOutputs[output.template_id] || output.content).length} 字元
                          </span>
                          <button
                            onClick={() => {
                              const contentToCopy = editableOutputs[output.template_id] || output.content
                              navigator.clipboard.writeText(contentToCopy)
                              alert('✓ 已複製！前往 Threads 發佈')
                            }}
                            className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition shadow-lg hover:scale-105 font-medium"
                          >
                            複製
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-red-600">
                        ❌ {output.error_message || '產出失敗'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 初始狀態 */}
            {!loading && outputs.length === 0 && !error && (
              <div className="flex items-center justify-center h-96 text-slate-400">
                <p>尚未產出內容</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
