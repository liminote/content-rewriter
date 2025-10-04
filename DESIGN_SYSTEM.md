# Design System - Content Rewriter

## 設計參考
**參考網站**: https://www.aura.build/share/O0SB9DW

---

## ⚠️ 強制標準 - 頁面結構

### 所有頁面必須使用此結構（不可變更任何 className）：

```tsx
<Layout>
  <div className="p-6 max-w-7xl mx-auto space-y-6">
    {/* 頁面標題 - 固定結構 */}
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold text-indigo-800">頁面標題</h1>
        <p className="mt-2 text-sm text-slate-600">頁面描述</p>
      </div>
    </div>

    {/* 頁面內容 */}
  </div>
</Layout>
```

### 絕對不可變更的 className（按順序）：
- 外層容器：`p-6 max-w-7xl mx-auto space-y-6`
- 標題容器：`flex items-start justify-between` ⚠️ **必須是 items-start，不是 items-center**
- 標題：`text-3xl font-bold text-indigo-800`
- 描述：`mt-2 text-sm text-slate-600`（順序：mt-2, text-sm, text-slate-600）

---

## 色彩系統

### 背景色
- **主背景**: `bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50`

### 卡片 / 容器
- **玻璃擬態**: `bg-white/30 backdrop-blur-xl border border-white/20 shadow-xl`
- **輸入框**: `bg-white/40 backdrop-blur-sm border border-white/30`
- **Hover 狀態**: `hover:bg-white/50`

### 主要顏色
- **主色調漸層**: `bg-gradient-to-r from-blue-500 to-cyan-600`
- **Hover**: `hover:from-blue-600 hover:to-cyan-700`
- **次要漸層**: `from-purple-400 via-cyan-500 to-purple-400`

### 文字顏色
- **標題**: `text-indigo-800`
- **主文**: `text-slate-600`
- **次要文字**: `text-slate-500`
- **Placeholder**: `placeholder-indigo-400` 或 `placeholder-indigo-500`

### 狀態顏色
- **成功/啟用**: `text-green-500` / `bg-green-100/50`
- **警告**: `text-yellow-600` / `bg-yellow-50/50`
- **錯誤**: `text-red-600` / `bg-red-50/50` / `border-red-200`
- **資訊/預設**: `text-blue-700` / `bg-blue-100/50` / `border-blue-200`

## 圓角系統
- **大圓角 (卡片/容器)**: `rounded-3xl` (24px)
- **中圓角 (按鈕/輸入框)**: `rounded-2xl` (16px)
- **小圓角 (標籤/badge)**: `rounded-xl` (12px)
- **全圓**: `rounded-full`

## 按鈕樣式

### Primary Button (主要操作)
```tsx
className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition hover:scale-105 shadow-lg"
```

### Secondary Button (次要操作)
```tsx
className="px-6 py-3 bg-white/40 backdrop-blur-sm text-indigo-700 rounded-2xl hover:bg-white/50 transition border border-white/30"
```

### Outline Button (外框按鈕)
```tsx
className="px-6 py-3 border-2 border-blue-500 text-blue-500 bg-white/20 backdrop-blur-xl rounded-2xl hover:bg-blue-500 hover:text-white transition hover:scale-105"
```

### Danger Button (危險操作)
```tsx
className="px-4 py-2 bg-white/40 backdrop-blur-sm text-red-600 rounded-2xl hover:bg-red-50/50 transition border border-red-200/50 hover:scale-105"
```

### Disabled 狀態
```tsx
disabled:opacity-50 disabled:cursor-not-allowed
```

## 輸入框樣式

### Text Input
```tsx
className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-indigo-400 hover:bg-white/50 transition"
```

### Textarea
```tsx
className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent resize-none placeholder-indigo-400 hover:bg-white/50 transition"
```

### Select Dropdown
```tsx
className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition"
```

## 卡片樣式

### 標準卡片
```tsx
className="p-6 bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl"
```

### 互動卡片 (可點擊/hover)
```tsx
className="p-6 bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl hover:bg-white/40 transition hover:scale-105"
```

## 陰影
- **標準陰影**: `shadow-xl`
- **按鈕陰影**: `shadow-lg`
- **微陰影**: `shadow-md`

## 間距
- **頁面 padding**: `p-6`
- **卡片內 padding**: `p-6`
- **元素間距**: `gap-4` 或 `gap-6` (16px / 24px)
- **section 間距**: `space-y-4` 或 `space-y-6`

## 動畫效果

### Hover Scale
```tsx
hover:scale-105  // 按鈕、卡片
hover:scale-110  // 圖標
```

### Transition
```tsx
transition  // 基本過渡
transition-all duration-700 ease-out  // 完整動畫
```

### Backdrop Filter
```tsx
backdrop-blur-xl   // 強模糊 (40px)
backdrop-blur-sm   // 弱模糊
```

## 標籤 / Badge

### 預設標籤
```tsx
className="px-2 py-1 bg-blue-100/50 backdrop-blur-sm text-blue-700 text-xs rounded-xl border border-blue-200"
```

### 成功標籤
```tsx
className="px-2 py-1 bg-green-100/50 backdrop-blur-sm text-green-700 text-xs rounded-xl border border-green-200"
```

## 導航列

### 導航容器
```tsx
// 導航列背景（固定）
className="bg-white/30 backdrop-blur-xl border-b border-white/20 shadow-lg sticky top-0 z-50"

// 導航內容容器（固定）
className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"

// Flex 容器（固定）
className="flex items-center justify-between h-16"
```

### Logo / 品牌
```tsx
className="text-indigo-800 text-xl font-bold"
```

### 導航連結
```tsx
// 基本樣式
base: "px-4 py-2 rounded-2xl text-sm font-medium transition"

// Active 狀態
active: "px-4 py-2 rounded-2xl text-sm font-medium transition bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg"

// 非 Active 狀態
inactive: "px-4 py-2 rounded-2xl text-sm font-medium transition text-slate-600 hover:bg-white/40 hover:text-indigo-800"
```

### 登出按鈕
```tsx
className="px-4 py-2 bg-white/40 backdrop-blur-sm text-indigo-700 rounded-2xl hover:bg-white/50 transition border border-white/30 text-sm"
```

### 使用者名稱顯示
```tsx
className="text-slate-600 text-sm"
```

### 分隔線
```tsx
className="border-l border-indigo-200/40 pl-4"  // 左側邊框 + 左padding
```

## Modal / 彈窗

### 遮罩層
```tsx
className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
```

### Modal 容器
```tsx
className="bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl"
```

### Modal 標題
```tsx
className="text-2xl font-bold mb-2 text-indigo-800"
```

### Modal 描述
```tsx
className="text-slate-600 mb-6 text-sm"
```

## 表單元素標籤

### 標準標籤
```tsx
className="block text-sm font-medium text-indigo-800 mb-1"
// 或加上 mb-2 如果下方元素需要更多間距
className="block text-sm font-medium text-indigo-800 mb-2"
```

### 標籤附帶字數/限制提示
```tsx
<label className="block text-sm font-medium text-indigo-800 mb-1">
  模板名稱 <span className="text-slate-500">({length}/50)</span>
</label>
```

## 錯誤/警告訊息框

### 錯誤訊息 (紅色)
```tsx
className="bg-red-50/50 backdrop-blur-sm border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm"
// 或較大的錯誤卡片
className="p-4 bg-white/30 backdrop-blur-xl border border-red-200 text-red-600 rounded-3xl shadow-xl"
```

### 警告訊息 (黃色)
```tsx
className="bg-yellow-50/50 backdrop-blur-sm border border-yellow-200 text-yellow-700 px-4 py-3 rounded-2xl text-sm"
```

### 資訊訊息 (藍色)
```tsx
className="bg-blue-50/50 backdrop-blur-sm border border-blue-200 text-blue-700 px-4 py-3 rounded-2xl text-sm"
```

### 成功訊息 (綠色)
```tsx
className="bg-green-50/50 backdrop-blur-sm border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm"
```

## Checkbox / Radio

### Checkbox 樣式
```tsx
className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-white/30 rounded"
```

### Checkbox 容器 Label
```tsx
className="flex items-center p-3 rounded-2xl hover:bg-white/40 cursor-pointer transition"
```

### Checkbox 文字標籤
```tsx
className="ml-3 text-sm text-slate-700"
```

## 資訊卡片 (例如：配額顯示)

### 配額卡片
```tsx
className="text-right bg-white/30 backdrop-blur-xl border border-white/20 rounded-2xl px-6 py-2 shadow-lg"
```

### 配額標題文字
```tsx
className="text-sm text-slate-500"
```

### 配額數字
```tsx
className="text-2xl font-bold text-indigo-800"
```

### 配額單位
```tsx
className="text-xs text-slate-400 mt-1"
```

## 文字大小與粗細

### 標題層級
- H1 (頁面主標題): `text-3xl font-bold text-indigo-800`
- H2 (卡片標題): `text-xl font-semibold text-indigo-800` 或 `text-lg font-medium text-indigo-800`
- H3 (子標題): `text-lg font-semibold text-indigo-800`

### 正文
- 一般正文: `text-sm text-slate-600` 或 `text-slate-600`
- 次要說明: `text-sm text-slate-500` 或 `text-xs text-slate-400`

## Grid / Layout

### 雙欄佈局 (左右分割)
```tsx
className="grid grid-cols-1 lg:grid-cols-2 gap-6"
```

### 垂直堆疊
```tsx
className="space-y-4"  // 16px 間距
className="space-y-6"  // 24px 間距
```

### 水平排列
```tsx
className="flex gap-2"   // 8px 間距
className="flex gap-3"   // 12px 間距
className="flex gap-4"   // 16px 間距
```

## Loading / Skeleton

### Spinner (旋轉動畫)
```tsx
// 容器：置中顯示
className="flex flex-col items-center justify-center h-96"

// Spinner 本體
className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"

// Loading 文字
className="text-slate-600"

// 次要說明文字
className="text-sm text-slate-400 mt-2"
```

### 全頁面 Loading
```tsx
<div className="flex items-center justify-center min-h-screen">
  <div className="text-gray-600">載入中...</div>
</div>
```

### 小型 Loading (按鈕內)
```tsx
// 按鈕文字
{loading ? '產出中...' : '產出'}
{loading ? '登入中...' : '登入'}
```

## 空狀態 (Empty State)

### 置中空狀態
```tsx
className="text-center py-12 text-slate-500"
```

### 右側面板空狀態
```tsx
className="flex items-center justify-center h-96 text-slate-400"
```

## 產出結果卡片

### 成功產出
```tsx
className="border rounded-2xl p-4 border-white/30 bg-white/40 backdrop-blur-sm"
```

### 失敗產出
```tsx
className="border rounded-2xl p-4 border-red-200 bg-red-50/50 backdrop-blur-sm"
```

### 產出結果標題容器
```tsx
className="flex items-center justify-between mb-3"
```

### 產出結果內容
```tsx
className="text-sm text-slate-700 whitespace-pre-wrap"
```

### 產出失敗訊息
```tsx
className="text-sm text-red-600"
```

## 字數統計

### 字數顯示容器
```tsx
className="mt-2 flex items-center justify-between text-sm text-slate-500"
```

### 字數文字
```tsx
<span>{article.length} 字元</span>
```

## 登入頁面專用樣式

### 登入頁面容器
```tsx
className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4"
```

### 登入表單最外層
```tsx
className="max-w-md w-full space-y-8"
```

### Logo 圖標容器
```tsx
className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center rounded-2xl shadow-lg mb-4"
```

### 登入標題
```tsx
className="text-4xl font-bold text-indigo-800"
```

### 登入表單卡片
```tsx
className="bg-white/30 backdrop-blur-xl border border-white/20 py-8 px-6 shadow-xl rounded-3xl"
```

### 忘記密碼連結
```tsx
className="text-blue-500 hover:text-blue-700 transition"
```

## Z-Index 層級

- **導航列**: `z-50` (最上層，固定在頁面頂部)
- **Modal 遮罩**: `z-50` (與導航列同層，因為 modal 會覆蓋整個頁面)
- **一般內容**: 不需要 z-index

## 字體
- **主字體**: Inter (系統預設)
- **選用字體**: Geist (可選，用於標題或重點)

## 圖標顏色
- **一般圖標**: `text-blue-500`
- **Hover**: `hover:text-blue-700`
- **禁用**: `disabled:opacity-30`

## 特殊操作按鈕

### 上移/下移按鈕
```tsx
className="p-2 text-blue-500 hover:text-blue-700 disabled:opacity-30 hover:bg-white/40 rounded-xl transition"
```

### 複製按鈕 (在 textarea 內絕對定位)
```tsx
// 容器需要 relative
className="relative"

// 按鈕
className="absolute top-3 right-3 px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition shadow-lg hover:scale-105"
```

### 小型操作按鈕
```tsx
className="px-4 py-2 text-sm bg-white/40 backdrop-blur-sm text-indigo-700 rounded-2xl hover:bg-white/50 transition border border-white/30 hover:scale-105"
```

## Whitespace 處理

### 保留換行和空格
```tsx
className="whitespace-pre-wrap"
```

### 單行截斷
```tsx
className="truncate"
```

### 多行截斷
```tsx
className="line-clamp-2"  // 兩行
className="line-clamp-3"  // 三行
```
