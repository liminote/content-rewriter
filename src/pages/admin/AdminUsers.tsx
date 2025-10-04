import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { useAdminUsersStore, type AdminUser } from '@/store/adminUsersStore'

export function AdminUsers() {
  const {
    users,
    loading,
    error,
    searchQuery,
    statusFilter,
    fetchUsers,
    createUser,
    updateUser,
    toggleUserStatus,
    resendInvite,
    setSearchQuery,
    setStatusFilter,
  } = useAdminUsersStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    access_start_date: '',
    access_end_date: '',
    note: '',
  })
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // 篩選使用者
  const filteredUsers = users.filter((user) => {
    // 搜尋篩選
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())

    // 狀態篩選
    let matchesStatus = true
    if (statusFilter === 'active') matchesStatus = user.is_active
    if (statusFilter === 'inactive') matchesStatus = !user.is_active
    if (statusFilter === 'pending') matchesStatus = user.invite_status === 'pending'

    return matchesSearch && matchesStatus
  })

  const handleCreate = async () => {
    if (!formData.email || !formData.name) {
      setFormError('請填寫 Email 和姓名')
      return
    }

    if (formData.name.length > 100) {
      setFormError('姓名不可超過 100 字')
      return
    }

    try {
      await createUser(formData)
      setShowCreateModal(false)
      setFormData({ email: '', name: '', access_start_date: '', access_end_date: '', note: '' })
      setFormError(null)
    } catch (error: any) {
      setFormError(error.message)
    }
  }

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      name: user.name,
      access_start_date: user.access_start_date || '',
      access_end_date: user.access_end_date || '',
      note: user.note || '',
    })
    setShowEditModal(true)
  }

  const handleUpdate = async () => {
    if (!editingUser) return
    if (!formData.name) {
      setFormError('請填寫姓名')
      return
    }

    try {
      await updateUser(editingUser.id, {
        name: formData.name,
        access_start_date: formData.access_start_date || null,
        access_end_date: formData.access_end_date || null,
        note: formData.note || null,
      })
      setShowEditModal(false)
      setEditingUser(null)
      setFormData({ email: '', name: '', access_start_date: '', access_end_date: '', note: '' })
      setFormError(null)
    } catch (error: any) {
      setFormError(error.message)
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (confirm(`確定要${currentStatus ? '停用' : '啟用'}此使用者嗎？`)) {
      try {
        await toggleUserStatus(userId, !currentStatus)
      } catch (error: any) {
        alert(error.message)
      }
    }
  }

  const handleResendInvite = async (email: string) => {
    if (confirm('確定要重新發送邀請信嗎？')) {
      try {
        await resendInvite(email)
        alert('邀請信已重新發送')
      } catch (error: any) {
        alert(error.message)
      }
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-800">使用者管理</h1>
            <p className="mt-2 text-sm text-slate-600">
              共 {users.length} 位使用者（顯示 {filteredUsers.length} 位）
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg"
          >
            新增使用者
          </button>
        </div>

        {error && (
          <div className="p-4 bg-white/30 backdrop-blur-xl border border-red-200 text-red-600 rounded-3xl shadow-xl">
            {error}
          </div>
        )}

        {/* 搜尋和篩選 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋使用者姓名或 Email..."
              className="flex-1 px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-indigo-400 hover:bg-white/50 transition"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition"
            >
              <option value="all">所有狀態</option>
              <option value="active">啟用</option>
              <option value="inactive">停用</option>
              <option value="pending">待邀請</option>
            </select>
          </div>
        </div>

        {/* 使用者列表 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          {loading && filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">載入中...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchQuery || statusFilter !== 'all' ? '沒有符合條件的使用者' : '尚無使用者資料'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl hover:bg-white/50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium text-indigo-800">{user.name}</h3>
                        {user.role === 'admin' && (
                          <span className="px-2 py-1 bg-blue-100/50 backdrop-blur-sm text-blue-700 text-xs rounded-xl border border-blue-200">
                            管理員
                          </span>
                        )}
                        {!user.is_active && (
                          <span className="px-2 py-1 bg-red-100/50 backdrop-blur-sm text-red-700 text-xs rounded-xl border border-red-200">
                            已停用
                          </span>
                        )}
                        {user.invite_status === 'pending' && (
                          <span className="px-2 py-1 bg-yellow-100/50 backdrop-blur-sm text-yellow-700 text-xs rounded-xl border border-yellow-200">
                            待邀請
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{user.email}</p>
                      {(user.access_start_date || user.access_end_date) && (
                        <p className="text-xs text-slate-500 mt-1">
                          使用期限：
                          {user.access_start_date || '不限'} ~ {user.access_end_date || '不限'}
                        </p>
                      )}
                      {user.note && (
                        <p className="text-xs text-slate-500 mt-1">備註：{user.note}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      {user.invite_status === 'pending' && (
                        <button
                          onClick={() => handleResendInvite(user.email)}
                          className="px-4 py-2 text-sm bg-white/40 backdrop-blur-sm text-indigo-700 rounded-2xl hover:bg-white/50 transition border border-white/30 hover:scale-105"
                        >
                          重發邀請
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(user)}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg"
                      >
                        編輯
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                          className={`px-4 py-2 text-sm rounded-2xl transition hover:scale-105 ${
                            user.is_active
                              ? 'bg-white/40 backdrop-blur-sm text-red-600 hover:bg-red-50/50 border border-red-200/50'
                              : 'bg-white/40 backdrop-blur-sm text-green-600 hover:bg-green-50/50 border border-green-200/50'
                          }`}
                        >
                          {user.is_active ? '停用' : '啟用'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 新增使用者 Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl">
              <h2 className="text-2xl font-bold mb-2 text-indigo-800">新增使用者</h2>
              <p className="text-slate-600 mb-6 text-sm">
                建立新使用者並發送邀請信
              </p>

              {formError && (
                <div className="mb-4 p-3 bg-red-50/50 backdrop-blur-sm text-red-600 rounded-2xl border border-red-200">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-indigo-800 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-indigo-400 hover:bg-white/50 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-800 mb-1">姓名 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="使用者姓名"
                    className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-indigo-400 hover:bg-white/50 transition"
                    maxLength={100}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-indigo-800 mb-1">
                      開始日期
                    </label>
                    <input
                      type="date"
                      value={formData.access_start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, access_start_date: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent hover:bg-white/50 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-indigo-800 mb-1">
                      結束日期
                    </label>
                    <input
                      type="date"
                      value={formData.access_end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, access_end_date: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent hover:bg-white/50 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-800 mb-1">備註</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="選填..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent resize-none placeholder-indigo-400 hover:bg-white/50 transition"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg disabled:opacity-50"
                  >
                    建立並發送邀請
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setFormData({
                        email: '',
                        name: '',
                        access_start_date: '',
                        access_end_date: '',
                        note: '',
                      })
                      setFormError(null)
                    }}
                    className="px-6 py-3 bg-white/40 backdrop-blur-sm text-indigo-700 rounded-2xl hover:bg-white/50 transition border border-white/30"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 編輯使用者 Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl">
              <h2 className="text-2xl font-bold mb-2 text-indigo-800">編輯使用者</h2>
              <p className="text-slate-600 mb-6 text-sm">{editingUser.email}</p>

              {formError && (
                <div className="mb-4 p-3 bg-red-50/50 backdrop-blur-sm text-red-600 rounded-2xl border border-red-200">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-indigo-800 mb-1">姓名 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent hover:bg-white/50 transition"
                    maxLength={100}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-indigo-800 mb-1">
                      開始日期
                    </label>
                    <input
                      type="date"
                      value={formData.access_start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, access_start_date: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent hover:bg-white/50 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-indigo-800 mb-1">
                      結束日期
                    </label>
                    <input
                      type="date"
                      value={formData.access_end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, access_end_date: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent hover:bg-white/50 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-800 mb-1">備註</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent resize-none hover:bg-white/50 transition"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg disabled:opacity-50"
                  >
                    儲存
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingUser(null)
                      setFormData({
                        email: '',
                        name: '',
                        access_start_date: '',
                        access_end_date: '',
                        note: '',
                      })
                      setFormError(null)
                    }}
                    className="px-6 py-3 bg-white/40 backdrop-blur-sm text-indigo-700 rounded-2xl hover:bg-white/50 transition border border-white/30"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
