# 設計一致性檢查清單

> 每次創建或修改頁面後，請依照此清單逐項檢查

## 📋 頁面結構檢查

### 基本結構
- [ ] 是否使用 `<Layout>` 包裹整個頁面？
- [ ] 外層容器使用：`<div className="p-6 max-w-7xl mx-auto space-y-6">`
- [ ] className 順序正確：`p-6` → `max-w-7xl` → `mx-auto` → `space-y-6`

### 頁面標題區
- [ ] 標題容器使用：`<div className="flex items-start justify-between">`
- [ ] ⚠️ 確認是 `items-start`，不是 `items-center`
- [ ] H1 標題使用：`className="text-3xl font-bold text-indigo-800"`
- [ ] 描述文字使用：`className="mt-2 text-sm text-slate-600"`
- [ ] className 順序正確：`mt-2` → `text-sm` → `text-slate-600`

## 🎨 視覺元素檢查

### 卡片容器
- [ ] 使用標準卡片樣式：`bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6`
- [ ] 圓角使用：`rounded-3xl`（卡片）
- [ ] Padding 使用：`p-6`

### 按鈕
- [ ] Primary 按鈕：`px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg`
- [ ] Secondary 按鈕：`px-6 py-3 bg-white/40 backdrop-blur-sm text-indigo-700 rounded-2xl hover:bg-white/50 transition border border-white/30`
- [ ] Danger 按鈕：`px-4 py-2 bg-white/40 backdrop-blur-sm text-red-600 rounded-2xl hover:bg-red-50/50 transition border border-red-200/50 hover:scale-105`
- [ ] 按鈕圓角使用：`rounded-2xl`
- [ ] Disabled 狀態：`disabled:opacity-50 disabled:cursor-not-allowed`

### 輸入框
- [ ] Text Input/Textarea：`w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-indigo-400 hover:bg-white/50 transition`
- [ ] Select：`w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition`
- [ ] 圓角使用：`rounded-2xl`
- [ ] Placeholder 顏色：`placeholder-indigo-400`

### 錯誤訊息
- [ ] 錯誤訊息框：`bg-red-50/50 backdrop-blur-sm border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm`
- [ ] 顏色：`text-red-700` 或 `text-red-600`
- [ ] 邊框：`border-red-200`

## 🔤 文字樣式檢查

### 標題層級
- [ ] H1（頁面標題）：`text-3xl font-bold text-indigo-800`
- [ ] H2（卡片標題）：`text-xl font-semibold text-indigo-800` 或 `text-lg font-medium text-indigo-800`
- [ ] H3（子標題）：`text-lg font-semibold text-indigo-800`

### 正文
- [ ] 一般正文：`text-sm text-slate-600` 或 `text-slate-600`
- [ ] 次要說明：`text-sm text-slate-500` 或 `text-xs text-slate-400`
- [ ] Placeholder：`placeholder-indigo-400`

## 📐 間距檢查

### 容器間距
- [ ] 外層容器：`space-y-6`（必須）
- [ ] 卡片內容：`space-y-4`
- [ ] 按鈕群組：`flex gap-2` 或 `gap-3`

### Padding/Margin
- [ ] 頁面 padding：`p-6`
- [ ] 卡片 padding：`p-6`
- [ ] 描述文字上方：`mt-2`

## 🎭 互動效果檢查

### Hover 效果
- [ ] 按鈕 hover：`hover:scale-105`
- [ ] 卡片 hover（如需互動）：`hover:bg-white/40 transition hover:scale-105`
- [ ] 輸入框 hover：`hover:bg-white/50`
- [ ] 連結 hover：`hover:text-blue-700`

### 動畫
- [ ] 所有互動元素都有：`transition`
- [ ] Loading spinner：`animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500`

## 🧩 特殊元件檢查

### Modal
- [ ] 遮罩層：`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50`
- [ ] Modal 容器：`bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl`
- [ ] Modal 標題：`text-2xl font-bold mb-2 text-indigo-800`

### Badge/標籤
- [ ] 預設標籤：`px-2 py-1 bg-blue-100/50 backdrop-blur-sm text-blue-700 text-xs rounded-xl border border-blue-200`
- [ ] 圓角使用：`rounded-xl`

### Checkbox
- [ ] Checkbox：`h-4 w-4 text-blue-500 focus:ring-blue-500 border-white/30 rounded`
- [ ] Label 容器：`flex items-center p-3 rounded-2xl hover:bg-white/40 cursor-pointer transition`
- [ ] Label 文字：`ml-3 text-sm text-slate-700`

## ✅ 最終檢查

### 與其他頁面對比
- [ ] 用瀏覽器打開新頁面和現有頁面（如 WorkspacePage、TemplatesPage）
- [ ] 檢查標題與 header 的距離是否一致
- [ ] 檢查頁面寬度是否一致
- [ ] 檢查所有元素的樣式是否一致

### 響應式檢查
- [ ] 在不同螢幕尺寸下測試（手機、平板、桌面）
- [ ] 確認 Layout 容器使用：`max-w-7xl mx-auto`

### 功能檢查
- [ ] 導航列正常顯示
- [ ] 所有連結可點擊
- [ ] 所有按鈕功能正常
- [ ] 表單驗證正常

## 🚨 常見錯誤提醒

### 絕對禁止：
- ❌ 使用 `items-center` 在標題容器（必須用 `items-start`）
- ❌ 使用不同的 `max-width`（必須是 `max-w-7xl`）
- ❌ 忘記加 `space-y-6` 在外層容器
- ❌ className 順序錯誤（例如：`text-slate-600 mt-2 text-sm` 是錯的）
- ❌ 使用不同的圓角（卡片 `rounded-3xl`、按鈕/輸入框 `rounded-2xl`、標籤 `rounded-xl`）
- ❌ 忘記包裹 `<Layout>`

### 必須做到：
- ✅ 從 `PAGE_TEMPLATE.tsx` 複製結構
- ✅ 完整複製 className，不要改動順序
- ✅ 使用 DESIGN_SYSTEM.md 中定義的樣式
- ✅ 修改後與其他頁面對比確認一致性

---

## 📚 相關文件

1. **DESIGN_SYSTEM.md** - 完整設計系統規範
2. **PAGE_TEMPLATE.tsx** - 標準頁面模板
3. **DEVELOPMENT_GUIDELINES.md** - 開發流程指南
4. **REQUIREMENTS.md** - 功能需求文件

---

**最後提醒**：所有設計必須與參考網站一致 → https://www.aura.build/share/O0SB9DW
