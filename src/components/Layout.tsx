import { ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()
  const [showAdminMenu, setShowAdminMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const isAdminPath = () => {
    return location.pathname.startsWith('/admin')
  }

  const navLinkClass = (path: string) => {
    const base = 'px-4 py-2 rounded-2xl text-sm font-medium transition'
    return isActive(path)
      ? `${base} bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg`
      : `${base} text-slate-600 hover:bg-white/40 hover:text-indigo-800`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 導航列 */}
      <nav className="bg-white/30 backdrop-blur-xl border-b border-white/20 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & 品牌 */}
            <div className="flex items-center">
              <Link to="/workspace" className="text-indigo-800 text-xl font-bold">
                Content Rewriter
              </Link>
            </div>

            {/* 導航連結 */}
            <div className="hidden md:flex items-center space-x-2">
              <Link to="/workspace" className={navLinkClass('/workspace')}>
                工作區
              </Link>
              <Link to="/templates" className={navLinkClass('/templates')}>
                模板管理
              </Link>
              <Link to="/history" className={navLinkClass('/history')}>
                歷史記錄
              </Link>
              <Link to="/settings" className={navLinkClass('/settings')}>
                設定
              </Link>
              <Link to="/guide" className={navLinkClass('/guide')}>
                使用說明
              </Link>

              {/* 管理員選單（僅 Admin 可見） */}
              {profile?.role === 'admin' && (
                <div className="relative">
                  <button
                    onClick={() => setShowAdminMenu(!showAdminMenu)}
                    className={`px-4 py-2 rounded-2xl text-sm font-medium transition ${
                      isAdminPath()
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg'
                        : 'text-slate-600 hover:bg-white/40 hover:text-indigo-800'
                    }`}
                  >
                    管理員 ▾
                  </button>
                  {showAdminMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white/40 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl py-2">
                      <Link
                        to="/admin"
                        onClick={() => setShowAdminMenu(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-white/50 transition"
                      >
                        系統監控
                      </Link>
                      <Link
                        to="/admin/users"
                        onClick={() => setShowAdminMenu(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-white/50 transition"
                      >
                        使用者管理
                      </Link>
                      <Link
                        to="/admin/templates"
                        onClick={() => setShowAdminMenu(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-white/50 transition"
                      >
                        預設模板
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* 使用者資訊 & 登出 */}
              <div className="ml-4 flex items-center space-x-3 border-l border-indigo-200/40 pl-4">
                <span className="text-slate-600 text-sm">
                  {profile?.name || '使用者'}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-white/40 backdrop-blur-sm text-indigo-700 rounded-2xl hover:bg-white/50 transition border border-white/30 text-sm"
                >
                  登出
                </button>
              </div>
            </div>

            {/* 手機版選單按鈕 */}
            <div className="md:hidden">
              <button className="text-indigo-700 p-2 hover:bg-white/40 rounded-xl transition">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要內容 */}
      <main>
        {children}
      </main>
    </div>
  )
}
