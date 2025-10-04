import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

// Pages
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { InvitePage } from './pages/InvitePage'
import { WorkspacePage } from './pages/WorkspacePage'
import { TemplatesPage } from './pages/TemplatesPage'
import { HistoryPage } from './pages/HistoryPage'
import { ScheduledPostsPage } from './pages/ScheduledPostsPage'
import { SettingsPage } from './pages/SettingsPage'
import { GuidePage } from './pages/GuidePage'

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminTemplates } from './pages/admin/AdminTemplates'

// Route Guards
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'

function App() {
  const { checkAuth, initialized } = useAuthStore()

  useEffect(() => {
    if (!initialized) {
      checkAuth()
    }
  }, [initialized, checkAuth])

  return (
    <BrowserRouter>
      <Routes>
        {/* 公開路由 */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invite" element={<InvitePage />} />

        {/* 受保護的使用者路由 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/scheduled-posts" element={<ScheduledPostsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/guide" element={<GuidePage />} />
        </Route>

        {/* 管理員路由 */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/templates" element={<AdminTemplates />} />
        </Route>

        {/* 404 導向首頁 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
