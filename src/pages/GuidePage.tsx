import { Layout } from '@/components/Layout'

export function GuidePage() {
  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-800">使用說明</h1>
            <p className="mt-2 text-sm text-slate-600">了解如何使用 Content Rewriter</p>
          </div>
        </div>

        {/* 快速開始 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-medium text-indigo-800 mb-4">🚀 快速開始</h2>
          <div className="space-y-3 text-sm text-slate-700">
            <p>Content Rewriter 是一個基於 AI 的內容改寫工具，可以幫助您快速產出多種風格的內容。</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>在「工作區」貼上您的原始文章</li>
              <li>選擇您想要的改寫模板</li>
              <li>選擇 AI 引擎（目前支援 Gemini）</li>
              <li>點擊「產出」按鈕</li>
              <li>查看並複製產出結果</li>
            </ol>
          </div>
        </div>

        {/* 功能說明 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-medium text-indigo-800 mb-4">📝 功能說明</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-indigo-700 mb-2">工作區</h3>
              <p className="text-sm text-slate-600">輸入原始文章，選擇模板進行 AI 改寫，查看即時產出結果。</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-indigo-700 mb-2">模板管理</h3>
              <p className="text-sm text-slate-600">新增、編輯、刪除您的自訂改寫模板，調整 prompt 以獲得更好的效果。</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-indigo-700 mb-2">歷史記錄</h3>
              <p className="text-sm text-slate-600">查看過去的產出記錄，隨時複製或刪除歷史內容。</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-indigo-700 mb-2">個人設定</h3>
              <p className="text-sm text-slate-600">修改個人資料、變更密碼、查看帳號資訊。</p>
            </div>
          </div>
        </div>

        {/* 使用限制 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-medium text-indigo-800 mb-4">⚠️ 使用限制</h2>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <span className="text-indigo-600">•</span>
              <p>每月產出次數限制：依您的方案而定（預設 100 次/月）</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-600">•</span>
              <p>歷史記錄保留：最多 100 筆</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-600">•</span>
              <p>自訂模板數量：無限制</p>
            </div>
          </div>
        </div>

        {/* 常見問題 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-medium text-indigo-800 mb-4">❓ 常見問題</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-indigo-700 mb-2">Q: 產出結果不理想怎麼辦？</h3>
              <p className="text-sm text-slate-600">A: 可以調整模板的 prompt，加入更具體的指示，或是嘗試不同的 AI 引擎。</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-indigo-700 mb-2">Q: 每月使用次數如何計算？</h3>
              <p className="text-sm text-slate-600">A: 每次產出會依「成功產出的模板數量」計算。例如選擇 4 個模板，全部成功則計算 4 次。</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-indigo-700 mb-2">Q: 可以一次產出多少個模板？</h3>
              <p className="text-sm text-slate-600">A: 沒有限制，但建議不要一次選擇過多模板，以避免等待時間過長。</p>
            </div>
          </div>
        </div>

        {/* 提示與技巧 */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-medium text-indigo-800 mb-4">💡 提示與技巧</h2>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <span className="text-indigo-600">•</span>
              <p>撰寫 prompt 時，盡量具體描述您想要的風格和要求</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-600">•</span>
              <p>產出結果可以直接編輯，複製時會複製編輯後的內容</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-600">•</span>
              <p>善用歷史記錄功能，隨時回顧過去的產出</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-600">•</span>
              <p>管理員可以設定預設模板，供所有使用者使用</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
