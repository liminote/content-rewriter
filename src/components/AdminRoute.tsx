import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function AdminRoute() {
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

  // 不是管理員，導向工作區
  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/workspace" replace />
  }

  // 是管理員，顯示子路由
  return <Outlet />
}
