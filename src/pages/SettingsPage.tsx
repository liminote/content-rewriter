import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'

export function SettingsPage() {
  const { profile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 個人資料
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // 密碼修改
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (profile) {
      setName(profile.name)
      setEmail(profile.email)
    }
  }, [profile])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未登入')

      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: '個人資料已更新' })

      // 重新載入 profile
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (updatedProfile) {
        useAuthStore.setState({ profile: updatedProfile })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '新密碼與確認密碼不符' })
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '密碼長度至少 6 個字元' })
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setMessage({ type: 'success', text: '密碼已更新' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-800">個人設定</h1>
            <p className="mt-2 text-sm text-slate-600">管理您的個人資料與帳號設定</p>
          </div>
        </div>

        {/* 訊息顯示 */}
        {message && (
          <div className={`bg-white/30 backdrop-blur-xl border rounded-3xl shadow-xl p-4 ${
            message.type === 'success'
              ? 'border-green-200 text-green-700'
              : 'border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* 個人資料卡片 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-medium text-indigo-800 mb-4">個人資料</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-indigo-800 mb-2">
                姓名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-indigo-400 hover:bg-white/50 transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-indigo-800 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-slate-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-slate-500">Email 無法修改</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-indigo-800 mb-2">
                角色
              </label>
              <input
                type="text"
                value={profile?.role === 'admin' ? '管理員' : '一般使用者'}
                disabled
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-slate-500 cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg font-medium disabled:opacity-50"
            >
              {loading ? '儲存中...' : '儲存變更'}
            </button>
          </form>
        </div>

        {/* 密碼修改卡片 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-medium text-indigo-800 mb-4">變更密碼</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-indigo-800 mb-2">
                新密碼
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-indigo-400 hover:bg-white/50 transition"
                placeholder="請輸入新密碼（至少 6 個字元）"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-indigo-800 mb-2">
                確認新密碼
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-indigo-400 hover:bg-white/50 transition"
                placeholder="再次輸入新密碼"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg font-medium disabled:opacity-50"
            >
              {loading ? '更新中...' : '更新密碼'}
            </button>
          </form>
        </div>

        {/* 帳號資訊卡片 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-medium text-indigo-800 mb-4">帳號資訊</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 bg-white/40 backdrop-blur-sm rounded-2xl">
              <span className="text-slate-600">帳號狀態</span>
              <span className={`px-3 py-1 rounded-xl text-xs font-medium ${
                profile?.is_active
                  ? 'bg-green-100/50 text-green-700 border border-green-200'
                  : 'bg-red-100/50 text-red-700 border border-red-200'
              }`}>
                {profile?.is_active ? '啟用' : '停用'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/40 backdrop-blur-sm rounded-2xl">
              <span className="text-slate-600">註冊日期</span>
              <span className="text-slate-700">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('zh-TW') : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
