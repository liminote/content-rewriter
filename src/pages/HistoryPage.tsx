import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { useHistoryStore } from '@/store/historyStore'

export function HistoryPage() {
  const { histories, loading, error, fetchHistories, deleteHistory } = useHistoryStore()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchHistories()
  }, [fetchHistories])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('複製失敗:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('確定要刪除此歷史記錄嗎？')) {
      await deleteHistory(id)
    }
  }

  const getAIEngineName = (engine: string) => {
    switch (engine) {
      case 'gemini':
        return 'Gemini'
      case 'claude':
        return 'Claude'
      case 'openai':
        return 'OpenAI'
      default:
        return engine
    }
  }

  const getAIEngineColor = (engine: string) => {
    switch (engine) {
      case 'gemini':
        return 'bg-gradient-to-r from-blue-500 to-cyan-600'
      case 'claude':
        return 'bg-gradient-to-r from-purple-500 to-pink-600'
      case 'openai':
        return 'bg-gradient-to-r from-green-500 to-emerald-600'
      default:
        return 'bg-gradient-to-r from-slate-500 to-slate-600'
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-800">歷史記錄</h1>
            <p className="mt-2 text-sm text-slate-600">查看過去的 AI 產出記錄</p>
          </div>
          <button
            onClick={() => fetchHistories()}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg disabled:opacity-50"
          >
            {loading ? '載入中...' : '重新整理'}
          </button>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-white/30 backdrop-blur-xl border border-red-200 rounded-3xl shadow-xl p-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* 載入中 */}
        {loading && !histories.length && (
          <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-12 text-center">
            <p className="text-slate-600">載入中...</p>
          </div>
        )}

        {/* 無記錄 */}
        {!loading && !error && histories.length === 0 && (
          <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-12 text-center">
            <p className="text-slate-600">尚無歷史記錄</p>
          </div>
        )}

        {/* 歷史記錄列表 */}
        {histories.map((history) => (
          <div
            key={history.id}
            className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6"
          >
            {/* 記錄標題列 */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-indigo-300/40">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 ${getAIEngineColor(history.ai_engine)} text-white text-sm rounded-xl shadow-md`}>
                  {getAIEngineName(history.ai_engine)}
                </span>
                <span className="text-sm text-slate-600">
                  {formatDate(history.created_at)}
                </span>
              </div>
              <button
                onClick={() => handleDelete(history.id)}
                className="px-4 py-2 bg-red-50/50 backdrop-blur-sm text-red-600 rounded-xl hover:bg-red-100/50 transition border border-red-200"
              >
                刪除
              </button>
            </div>

            {/* 產出內容列表 */}
            <div className="space-y-4">
              {history.outputs.map((output, index) => (
                <div
                  key={`${history.id}-${output.template_id}-${index}`}
                  className="bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl p-4"
                >
                  {/* 模板標題與狀態 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-indigo-800">
                        {output.template_name}
                      </h3>
                      {output.status === 'success' ? (
                        <span className="px-2 py-1 bg-green-100/50 backdrop-blur-sm text-green-700 text-xs rounded-lg border border-green-200">
                          成功
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100/50 backdrop-blur-sm text-red-700 text-xs rounded-lg border border-red-200">
                          失敗
                        </span>
                      )}
                    </div>
                    {output.status === 'success' && (
                      <button
                        onClick={() => handleCopy(output.content, `${history.id}-${output.template_id}-${index}`)}
                        className="px-3 py-1 bg-blue-50/50 backdrop-blur-sm text-blue-600 text-xs rounded-lg hover:bg-blue-100/50 transition border border-blue-200"
                      >
                        {copiedId === `${history.id}-${output.template_id}-${index}` ? '已複製' : '複製'}
                      </button>
                    )}
                  </div>

                  {/* 產出內容 */}
                  {output.status === 'success' ? (
                    <div className="bg-white/30 backdrop-blur-sm border border-white/20 rounded-xl p-3">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {output.content}
                      </p>
                      <div className="mt-2 text-xs text-slate-500 text-right">
                        {output.content.length} 字
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50/30 backdrop-blur-sm border border-red-200 rounded-xl p-3">
                      <p className="text-sm text-red-600">
                        {output.error_message || '產出失敗'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
