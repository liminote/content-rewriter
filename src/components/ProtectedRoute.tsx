import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function ProtectedRoute() {
  const { user, profile, initialized, checkAuth } = useAuthStore()

  useEffect(() => {
    if (!initialized) {
      checkAuth()
    }
  }, [initialized, checkAuth])

  // 正在初始化，顯示載入畫面
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  // 未登入，導向登入頁
  if (!user) {
    return <Navigate to="/" replace />
  }

  // 已登入但帳號未啟用
  if (profile && !profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white py-8 px-6 shadow rounded-lg">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">帳號已停用</h3>
              <p className="mt-2 text-sm text-gray-600">
                您的帳號已被停用，請聯繫管理員
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 已登入且為一般使用者，檢查使用期限
  if (profile && profile.role !== 'admin') {
    const now = new Date()
    const startDate = profile.access_start_date ? new Date(profile.access_start_date) : null
    const endDate = profile.access_end_date ? new Date(profile.access_end_date) : null

    // 檢查是否在使用期限內
    if (startDate && now < startDate) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white py-8 px-6 shadow rounded-lg">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">帳號尚未開始使用</h3>
                <p className="mt-2 text-sm text-gray-600">
                  您的帳號使用期限尚未開始，請聯繫管理員
                </p>
                {startDate && (
                  <p className="mt-1 text-sm text-gray-500">
                    開始日期：{startDate.toLocaleDateString('zh-TW')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (endDate && now > endDate) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white py-8 px-6 shadow rounded-lg">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">帳號使用期限已過</h3>
                <p className="mt-2 text-sm text-gray-600">
                  您的帳號使用期限已過，請聯繫管理員
                </p>
                {endDate && (
                  <p className="mt-1 text-sm text-gray-500">
                    到期日期：{endDate.toLocaleDateString('zh-TW')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }
  }

  // 通過所有檢查，顯示子路由
  return <Outlet />
}
