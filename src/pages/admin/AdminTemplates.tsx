import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { useDefaultTemplateStore, type DefaultTemplate } from '@/store/defaultTemplateStore'

export function AdminTemplates() {
  const { templates, loading, error, fetchTemplates, createTemplate, updateTemplate, deleteTemplate, toggleTemplateStatus, reorderTemplates } = useDefaultTemplateStore()

  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', prompt: '' })
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.prompt.trim()) {
      setFormError('請填寫模板名稱和 Prompt')
      return
    }
    if (formData.name.length > 50) {
      setFormError('模板名稱不可超過 50 字')
      return
    }
    if (formData.prompt.length > 500) {
      setFormError('Prompt 不可超過 500 字')
      return
    }

    try {
      await createTemplate(formData)
      setFormData({ name: '', prompt: '' })
      setIsCreating(false)
      setFormError(null)
    } catch (error: any) {
      setFormError(error.message)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim() || !formData.prompt.trim()) {
      setFormError('請填寫模板名稱和 Prompt')
      return
    }
    if (formData.name.length > 50) {
      setFormError('模板名稱不可超過 50 字')
      return
    }
    if (formData.prompt.length > 500) {
      setFormError('Prompt 不可超過 500 字')
      return
    }

    try {
      await updateTemplate(id, formData)
      setEditingId(null)
      setFormData({ name: '', prompt: '' })
      setFormError(null)
    } catch (error: any) {
      setFormError(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('確定要刪除此預設模板嗎？\n\n注意：僅影響未來新註冊的使用者，不影響現有使用者。')) {
      try {
        await deleteTemplate(id)
      } catch (error: any) {
        alert(error.message)
      }
    }
  }

  const handleEdit = (template: DefaultTemplate) => {
    setEditingId(template.id)
    setFormData({ name: template.name, prompt: template.prompt })
    setIsCreating(false)
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleTemplateStatus(id, !currentStatus)
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const newTemplates = [...templates]
    ;[newTemplates[index - 1], newTemplates[index]] = [newTemplates[index], newTemplates[index - 1]]
    await reorderTemplates(newTemplates)
  }

  const handleMoveDown = async (index: number) => {
    if (index === templates.length - 1) return
    const newTemplates = [...templates]
    ;[newTemplates[index], newTemplates[index + 1]] = [newTemplates[index + 1], newTemplates[index]]
    await reorderTemplates(newTemplates)
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-800">預設模板管理</h1>
            <p className="mt-2 text-sm text-slate-600">
              已建立 {templates.length} 個預設模板（僅影響新註冊使用者）
            </p>
          </div>
          {!isCreating && !editingId && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg"
            >
              新增預設模板
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-white/30 backdrop-blur-xl border border-red-200 text-red-600 rounded-3xl shadow-xl">
            {error}
          </div>
        )}

        {/* 新增/編輯表單 */}
        {(isCreating || editingId) && (
          <div className="p-6 bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-indigo-800">
              {isCreating ? '新增預設模板' : '編輯預設模板'}
            </h2>
            {formError && (
              <div className="mb-4 p-3 bg-red-50/50 backdrop-blur-sm text-red-600 rounded-2xl border border-red-200">
                {formError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-indigo-800 mb-1">
                  模板名稱 <span className="text-slate-500">({formData.name.length}/50)</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：社群媒體貼文"
                  className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-indigo-400 hover:bg-white/50 transition"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-indigo-800 mb-1">
                  改寫 Prompt <span className="text-slate-500">({formData.prompt.length}/500)</span>
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  placeholder="請輸入詳細的改寫指令..."
                  rows={6}
                  className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent resize-none placeholder-indigo-400 hover:bg-white/50 transition"
                  maxLength={500}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => (isCreating ? handleCreate() : handleUpdate(editingId!))}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg disabled:opacity-50"
                >
                  {isCreating ? '建立' : '儲存'}
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false)
                    setEditingId(null)
                    setFormData({ name: '', prompt: '' })
                    setFormError(null)
                  }}
                  className="px-6 py-3 bg-white/40 backdrop-blur-sm text-indigo-700 rounded-2xl hover:bg-white/50 transition border border-white/30"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 模板列表 */}
        {loading && templates.length === 0 ? (
          <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
            <div className="text-center py-12 text-slate-500">載入中...</div>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
            <div className="text-center py-12 text-slate-500">
              還沒有預設模板，點擊「新增預設模板」開始建立
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template, index) => (
              <div
                key={template.id}
                className="p-6 bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-indigo-800">{template.name}</h3>
                      {template.is_active ? (
                        <span className="px-2 py-1 bg-green-100/50 backdrop-blur-sm text-green-700 text-xs rounded-xl border border-green-200">
                          啟用
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100/50 backdrop-blur-sm text-red-700 text-xs rounded-xl border border-red-200">
                          停用
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-slate-600 whitespace-pre-wrap">{template.prompt}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {/* 排序按鈕 */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-2 text-blue-500 hover:text-blue-700 disabled:opacity-30 hover:bg-white/40 rounded-xl transition"
                        title="上移"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === templates.length - 1}
                        className="p-2 text-blue-500 hover:text-blue-700 disabled:opacity-30 hover:bg-white/40 rounded-xl transition"
                        title="下移"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleToggleStatus(template.id, template.is_active)}
                    disabled={isCreating || editingId !== null}
                    className={`px-4 py-2 text-sm rounded-2xl transition hover:scale-105 disabled:opacity-50 ${
                      template.is_active
                        ? 'bg-white/40 backdrop-blur-sm text-yellow-600 hover:bg-yellow-50/50 border border-yellow-200/50'
                        : 'bg-white/40 backdrop-blur-sm text-green-600 hover:bg-green-50/50 border border-green-200/50'
                    }`}
                  >
                    {template.is_active ? '停用' : '啟用'}
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    disabled={isCreating || editingId !== null}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 disabled:opacity-50 shadow-lg"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    disabled={isCreating || editingId !== null}
                    className="px-4 py-2 text-sm bg-white/40 backdrop-blur-sm text-red-600 rounded-2xl hover:bg-red-50/50 transition border border-red-200/50 hover:scale-105 disabled:opacity-50"
                  >
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
