/**
 * 頁面模板 - 所有新頁面必須複製此結構
 *
 * ⚠️ 警告：絕對不可修改任何 className 的順序或內容
 * ⚠️ 任何修改都會導致頁面不一致
 */

import { Layout } from '@/components/Layout'

export function PageTemplate() {
  return (
    <Layout>
      {/*
        外層容器 - 固定 className
        p-6: padding
        max-w-7xl mx-auto: 最大寬度與置中
        space-y-6: 子元素垂直間距
      */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/*
          頁面標題區 - 固定結構
          不可修改此區塊的任何 className
        */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-800">頁面標題</h1>
            <p className="mt-2 text-sm text-slate-600">頁面描述文字</p>
          </div>

          {/* 右側操作按鈕區（可選） */}
          {/*
          <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg">
            主要操作
          </button>
          */}
        </div>

        {/*
          頁面內容區
          使用 space-y-6 已自動處理間距，不需要額外的 mb-6 或 mt-6
        */}

        {/* 卡片範例 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-medium text-indigo-800 mb-4">卡片標題</h2>
          <p className="text-slate-600">卡片內容</p>
        </div>

        {/* 表單範例 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <label className="block text-sm font-medium text-indigo-800 mb-2">
            輸入欄位標籤
          </label>
          <input
            type="text"
            placeholder="placeholder 文字"
            className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-indigo-400 hover:bg-white/50 transition"
          />
        </div>

        {/* 按鈕範例 */}
        <div className="flex gap-3">
          {/* 主要按鈕 */}
          <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg font-medium">
            主要操作
          </button>

          {/* 次要按鈕 */}
          <button className="px-6 py-3 bg-white/40 backdrop-blur-sm text-indigo-700 rounded-2xl hover:bg-white/50 transition border border-white/30">
            次要操作
          </button>
        </div>

      </div>
    </Layout>
  )
}

/**
 * 檢查清單（使用此模板時）：
 *
 * [ ] 已複製完整的外層容器結構
 * [ ] className 順序完全一致：p-6 max-w-7xl mx-auto space-y-6
 * [ ] 標題使用：text-3xl font-bold text-indigo-800
 * [ ] 描述使用：mt-2 text-sm text-slate-600
 * [ ] 沒有額外的 mb-6 或 mt-6（space-y-6 已處理）
 * [ ] 所有卡片使用統一的 className
 * [ ] 所有按鈕使用統一的 className
 */
