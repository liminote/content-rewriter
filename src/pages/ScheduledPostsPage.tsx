import { useEffect, useState, useMemo } from 'react'
import { Layout } from '@/components/Layout'
import { useScheduledPostsStore, type ScheduledPost, type Publication } from '@/store/scheduledPostsStore'
import { useThreadsAuthStore } from '@/store/threadsAuthStore'

export function ScheduledPostsPage() {
  const { posts, loading, error, fetchPosts, deletePost, publishPost, syncMetrics, updatePublication } = useScheduledPostsStore()
  const { isConnected, checkConnection, startAuthorization } = useThreadsAuthStore()

  const [editingHashtags, setEditingHashtags] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    fetchPosts()
    checkConnection()
  }, [fetchPosts, checkConnection])

  // 按來源標題分組
  const groupedPosts = useMemo(() => {
    const groups: Record<string, ScheduledPost[]> = {}
    posts.forEach(post => {
      if (!groups[post.source_title]) {
        groups[post.source_title] = []
      }
      groups[post.source_title].push(post)
    })
    return groups
  }, [posts])

  const handleHashtagsChange = (publicationId: string, value: string) => {
    setEditingHashtags(prev => ({
      ...prev,
      [publicationId]: value,
    }))
  }

  const handleHashtagsSave = async (publicationId: string, currentHashtags: string[]) => {
    const newHashtagsStr = editingHashtags[publicationId] || currentHashtags.join(' ')
    const newHashtags = newHashtagsStr
      .split(/\s+/)
      .filter(tag => tag.trim())
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`)

    try {
      await updatePublication(publicationId, newHashtags)
      setEditingHashtags(prev => {
        const updated = { ...prev }
        delete updated[publicationId]
        return updated
      })
    } catch (error) {
      console.error('更新 hashtags 失敗:', error)
    }
  }

  const handlePublish = async (publicationId: string) => {
    if (!isConnected) {
      if (confirm('您尚未連結 Threads 帳號，是否前往設定？')) {
        window.location.href = '/settings'
      }
      return
    }

    if (confirm('確定要立即發佈此貼文到 Threads 嗎？')) {
      try {
        await publishPost(publicationId)
      } catch (error) {
        alert(error instanceof Error ? error.message : '發佈失敗')
      }
    }
  }

  const handleSyncMetrics = async (publicationId: string) => {
    try {
      await syncMetrics(publicationId)
    } catch (error) {
      alert(error instanceof Error ? error.message : '同步失敗')
    }
  }

  const handleDelete = async (postId: string) => {
    if (confirm('確定要刪除此排程貼文嗎？')) {
      try {
        await deletePost(postId)
      } catch (error) {
        alert(error instanceof Error ? error.message : '刪除失敗')
      }
    }
  }

  const getStatusBadge = (status: Publication['status']) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100/50 text-yellow-700 text-xs rounded-lg border border-yellow-200">待發佈</span>
      case 'publishing':
        return <span className="px-2 py-1 bg-blue-100/50 text-blue-700 text-xs rounded-lg border border-blue-200">發佈中...</span>
      case 'published':
        return <span className="px-2 py-1 bg-green-100/50 text-green-700 text-xs rounded-lg border border-green-200">已發佈</span>
      case 'failed':
        return <span className="px-2 py-1 bg-red-100/50 text-red-700 text-xs rounded-lg border border-red-200">失敗</span>
    }
  }

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'threads':
        return <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs rounded-lg shadow">Threads</span>
      case 'facebook':
        return <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-lg shadow">Facebook</span>
      case 'instagram':
        return <span className="px-2 py-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xs rounded-lg shadow">Instagram</span>
      default:
        return <span className="px-2 py-1 bg-slate-500 text-white text-xs rounded-lg shadow">{platform}</span>
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-800">排程發文</h1>
            <p className="mt-2 text-sm text-slate-600">管理您的社群媒體貼文排程</p>
          </div>
          <div className="flex items-center gap-3">
            {!isConnected && (
              <button
                onClick={startAuthorization}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm rounded-2xl hover:from-purple-600 hover:to-pink-700 transition shadow-lg hover:scale-105 font-medium"
              >
                連結 Threads 帳號
              </button>
            )}
            <button
              onClick={() => fetchPosts()}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg disabled:opacity-50"
            >
              {loading ? '載入中...' : '重新整理'}
            </button>
          </div>
        </div>

        {/* Threads 帳號狀態提示 */}
        {!isConnected && (
          <div className="bg-yellow-50/50 backdrop-blur-xl border border-yellow-200 rounded-3xl shadow-xl p-4">
            <p className="text-yellow-700 text-sm">
              ⚠️ 您尚未連結 Threads 帳號，無法發佈貼文。請先前往<a href="/settings" className="underline">設定頁面</a>連結帳號。
            </p>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-white/30 backdrop-blur-xl border border-red-200 rounded-3xl shadow-xl p-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* 載入中 */}
        {loading && !posts.length && (
          <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-12 text-center">
            <p className="text-slate-600">載入中...</p>
          </div>
        )}

        {/* 無記錄 */}
        {!loading && !error && posts.length === 0 && (
          <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-12 text-center">
            <p className="text-slate-600">尚無排程貼文</p>
            <p className="text-sm text-slate-500 mt-2">請前往工作區產出內容後，選擇「送到排程發文」</p>
          </div>
        )}

        {/* 分組顯示貼文 */}
        {Object.entries(groupedPosts).map(([sourceTitle, groupPosts]) => (
          <div key={sourceTitle} className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
            <h2 className="text-xl font-semibold text-indigo-800 mb-4 pb-3 border-b border-indigo-300/40">
              📄 {sourceTitle}
            </h2>

            <div className="space-y-4">
              {groupPosts.map(post => (
                <div key={post.id} className="space-y-3">
                  {post.publications.map(pub => (
                    <div
                      key={pub.id}
                      className="bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl p-4"
                    >
                      {/* 標題列：平台與狀態 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getPlatformBadge(pub.platform)}
                          {getStatusBadge(pub.status)}
                        </div>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="px-3 py-1 bg-red-50/50 text-red-600 text-xs rounded-xl hover:bg-red-100/50 transition border border-red-200"
                        >
                          刪除
                        </button>
                      </div>

                      {/* 貼文內容 */}
                      <div className="bg-white/30 backdrop-blur-sm border border-white/20 rounded-xl p-3 mb-3">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{post.content}</p>
                        <div className="mt-2 text-xs text-slate-500 text-right">
                          {post.content.length} 字
                        </div>
                      </div>

                      {/* Hashtags 編輯區 */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Hashtags</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingHashtags[pub.id] !== undefined ? editingHashtags[pub.id] : (pub.hashtags || []).join(' ')}
                            onChange={(e) => handleHashtagsChange(pub.id, e.target.value)}
                            placeholder="例如：#科技 #AI #創新"
                            className="flex-1 px-3 py-2 bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50"
                          />
                          {editingHashtags[pub.id] !== undefined && (
                            <button
                              onClick={() => handleHashtagsSave(pub.id, pub.hashtags || [])}
                              className="px-3 py-2 bg-blue-500 text-white text-xs rounded-xl hover:bg-blue-600 transition"
                            >
                              儲存
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 操作按鈕 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {pub.status === 'pending' && (
                            <button
                              onClick={() => handlePublish(pub.id)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white text-sm rounded-xl hover:from-blue-600 hover:to-cyan-700 transition shadow-lg hover:scale-105 font-medium"
                            >
                              立即發佈
                            </button>
                          )}
                          {pub.status === 'failed' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handlePublish(pub.id)}
                                className="px-4 py-2 bg-orange-500 text-white text-sm rounded-xl hover:bg-orange-600 transition shadow-lg hover:scale-105"
                              >
                                重試發佈
                              </button>
                              <p className="text-xs text-red-600">
                                {pub.error_message} (已重試 {pub.retry_count} 次)
                              </p>
                            </div>
                          )}
                          {pub.status === 'published' && (
                            <>
                              <button
                                onClick={() => handleSyncMetrics(pub.id)}
                                className="px-3 py-2 bg-slate-100/50 text-slate-700 text-xs rounded-xl hover:bg-slate-200/50 transition border border-slate-300"
                              >
                                更新數據
                              </button>
                              {pub.platform_post_url && (
                                <a
                                  href={pub.platform_post_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-2 bg-indigo-100/50 text-indigo-700 text-xs rounded-xl hover:bg-indigo-200/50 transition border border-indigo-300"
                                >
                                  查看貼文
                                </a>
                              )}
                            </>
                          )}
                        </div>

                        {/* 互動數據 */}
                        {pub.status === 'published' && (
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <span>❤️ {pub.likes_count}</span>
                            <span>💬 {pub.comments_count}</span>
                            <span>🔄 {pub.shares_count}</span>
                            <span>👁️ {pub.views_count}</span>
                          </div>
                        )}
                      </div>

                      {/* 發佈時間 */}
                      {pub.published_at && (
                        <div className="mt-2 text-xs text-slate-500">
                          發佈於：{new Date(pub.published_at).toLocaleString('zh-TW')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
