import { useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { useAdminDashboardStore } from '@/store/adminDashboardStore'

export function AdminDashboard() {
  const { stats, errorLogs, recentActivity, loading, error, refreshAll } = useAdminDashboardStore()

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

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

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-800">系統監控儀表板</h1>
            <p className="mt-2 text-sm text-slate-600">即時查看系統統計與使用狀況</p>
          </div>
          <button
            onClick={() => refreshAll()}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg disabled:opacity-50"
          >
            {loading ? '更新中...' : '重新整理'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-white/30 backdrop-blur-xl border border-red-200 text-red-600 rounded-3xl shadow-xl">
            {error}
          </div>
        )}

        {/* 統計卡片區 - 第一行 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 總使用者數 */}
          <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">總使用者數</h3>
            <p className="text-3xl font-bold text-indigo-800">{stats?.totalUsers || 0}</p>
            <div className="mt-3 flex gap-4 text-xs text-slate-500">
              <span>啟用: {stats?.activeUsers || 0}</span>
              <span>停用: {stats?.inactiveUsers || 0}</span>
            </div>
          </div>

          {/* 今日產出 */}
          <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">今日產出</h3>
            <p className="text-3xl font-bold text-indigo-800">{stats?.todayGenerations || 0}</p>
            <div className="mt-3 text-xs text-slate-500">次</div>
          </div>

          {/* 本週產出 */}
          <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">本週產出</h3>
            <p className="text-3xl font-bold text-indigo-800">{stats?.weekGenerations || 0}</p>
            <div className="mt-3 text-xs text-slate-500">次</div>
          </div>

          {/* 本月產出 */}
          <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">本月產出</h3>
            <p className="text-3xl font-bold text-indigo-800">{stats?.monthGenerations || 0}</p>
            <div className="mt-3 text-xs text-slate-500">次</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI 引擎使用統計 */}
          <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
            <h2 className="text-lg font-medium text-indigo-800 mb-4">AI 引擎使用統計（本月）</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Gemini</span>
                  <span className="text-sm font-medium text-indigo-800">
                    {stats?.aiEngineStats.gemini || 0} 次
                  </span>
                </div>
                <div className="w-full h-2 bg-white/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 transition-all duration-300 rounded-full"
                    style={{
                      width: `${stats?.monthGenerations ? ((stats.aiEngineStats.gemini / stats.monthGenerations) * 100) : 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Claude</span>
                  <span className="text-sm font-medium text-indigo-800">
                    {stats?.aiEngineStats.claude || 0} 次
                  </span>
                </div>
                <div className="w-full h-2 bg-white/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-300 rounded-full"
                    style={{
                      width: `${stats?.monthGenerations ? ((stats.aiEngineStats.claude / stats.monthGenerations) * 100) : 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">OpenAI</span>
                  <span className="text-sm font-medium text-indigo-800">
                    {stats?.aiEngineStats.openai || 0} 次
                  </span>
                </div>
                <div className="w-full h-2 bg-white/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300 rounded-full"
                    style={{
                      width: `${stats?.monthGenerations ? ((stats.aiEngineStats.openai / stats.monthGenerations) * 100) : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* 本月 Token 使用統計 */}
          <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
            <h2 className="text-lg font-medium text-indigo-800 mb-4">本月 Token 使用統計</h2>
            <div className="space-y-3">
              {stats?.tokenUsage.gemini.total > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Gemini</span>
                    <span className="text-sm font-medium text-indigo-800">
                      {stats.tokenUsage.gemini.total.toLocaleString()} tokens
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pl-4">
                    <span>輸入: {stats.tokenUsage.gemini.input.toLocaleString()}</span>
                    <span>輸出: {stats.tokenUsage.gemini.output.toLocaleString()}</span>
                  </div>
                </div>
              )}
              {stats?.tokenUsage.claude.total > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Claude</span>
                    <span className="text-sm font-medium text-indigo-800">
                      {stats.tokenUsage.claude.total.toLocaleString()} tokens
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pl-4">
                    <span>輸入: {stats.tokenUsage.claude.input.toLocaleString()}</span>
                    <span>輸出: {stats.tokenUsage.claude.output.toLocaleString()}</span>
                  </div>
                </div>
              )}
              {stats?.tokenUsage.openai.total > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">OpenAI</span>
                    <span className="text-sm font-medium text-indigo-800">
                      {stats.tokenUsage.openai.total.toLocaleString()} tokens
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pl-4">
                    <span>輸入: {stats.tokenUsage.openai.input.toLocaleString()}</span>
                    <span>輸出: {stats.tokenUsage.openai.output.toLocaleString()}</span>
                  </div>
                </div>
              )}
              <div className="pt-3 border-t border-indigo-300/40">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-indigo-800">總計</span>
                  <span className="text-xl font-bold text-indigo-800">
                    {(stats?.tokenUsage.total.total || 0).toLocaleString()} tokens
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              ✨ 目前使用免費 API，無需付費
            </p>
          </div>
        </div>

        {/* 使用者使用排行 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-medium text-indigo-800 mb-4">本月使用排行 TOP 10</h2>
          {stats?.topUsers && stats.topUsers.length > 0 ? (
            <div className="space-y-3">
              {stats.topUsers.map((user, index) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 bg-white/40 backdrop-blur-sm rounded-2xl hover:bg-white/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-indigo-800 w-8">#{index + 1}</span>
                    <span className="text-sm text-slate-700">{user.user_name}</span>
                  </div>
                  <span className="text-sm font-medium text-indigo-800">
                    {user.usage_count} 次
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">尚無使用記錄</div>
          )}
        </div>

        {/* 最近建立的使用者 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-medium text-indigo-800 mb-4">最近建立的使用者</h2>
          {recentActivity?.recentUsers && recentActivity.recentUsers.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.recentUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 bg-white/40 backdrop-blur-sm rounded-2xl"
                >
                  <div>
                    <p className="text-sm font-medium text-indigo-800">{user.user_name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(user.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">尚無使用者</div>
          )}
        </div>

        {/* 系統錯誤日誌 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-medium text-indigo-800 mb-4">最近錯誤日誌（最新 20 筆）</h2>
          {errorLogs && errorLogs.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {errorLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-red-50/50 backdrop-blur-sm border border-red-200 rounded-2xl"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-100/50 backdrop-blur-sm text-red-700 text-xs rounded-xl border border-red-200">
                        {log.error_type}
                      </span>
                      {log.user_name && (
                        <span className="text-xs text-slate-600">使用者: {log.user_name}</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(log.created_at)}</span>
                  </div>
                  <p className="text-sm text-red-600">{log.error_message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">沒有錯誤記錄</div>
          )}
        </div>
      </div>
    </Layout>
  )
}
