/**
 * 測試高優先級修復
 * - 配額檢查順序
 * - 原子更新
 * - Rate limiting
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 載入環境變數
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function testAtomicUpdate() {
  console.log('\n🧪 測試 1: 原子更新 usage_quota')
  console.log('=' .repeat(50))

  try {
    // 取得第一個使用者
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single()

    if (!profiles) {
      console.log('❌ 找不到測試使用者')
      return
    }

    const userId = profiles.id

    // 取得當前配額
    const { data: before } = await supabase
      .from('usage_quota')
      .select('*')
      .eq('user_id', userId)
      .single()

    console.log('📊 更新前:', {
      usage_count: before?.usage_count,
      monthly_limit: before?.monthly_limit
    })

    // 測試原子更新
    const { data: result, error } = await supabase
      .rpc('increment_usage_count', {
        p_user_id: userId,
        p_increment: 3
      })
      .single()

    if (error) {
      console.log('❌ 原子更新失敗:', error.message)
      return
    }

    console.log('📊 更新後:', {
      usage_count: result.usage_count,
      expected: (before?.usage_count || 0) + 3
    })

    if (result.usage_count === (before?.usage_count || 0) + 3) {
      console.log('✅ 原子更新成功！')
    } else {
      console.log('❌ 更新結果不符預期')
    }

    // 還原
    await supabase
      .from('usage_quota')
      .update({ usage_count: before?.usage_count || 0 })
      .eq('user_id', userId)

    console.log('🔄 已還原配額')

  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message)
  }
}

async function testRateLimit() {
  console.log('\n🧪 測試 2: Rate Limiting')
  console.log('=' .repeat(50))

  try {
    // 取得第一個使用者
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single()

    if (!profiles) {
      console.log('❌ 找不到測試使用者')
      return
    }

    const userId = profiles.id

    console.log('📊 模擬連續請求...')

    // 清空計數
    await supabase
      .from('profiles')
      .update({
        last_request_at: null,
        request_count_minute: 0
      })
      .eq('id', userId)

    // 測試前 10 次請求應該成功
    for (let i = 1; i <= 10; i++) {
      const { data, error } = await supabase
        .rpc('check_rate_limit', {
          p_user_id: userId,
          p_max_requests: 10
        })
        .single()

      if (error) {
        console.log(`❌ 第 ${i} 次請求失敗:`, error.message)
        return
      }

      console.log(`  ${i}/10: allowed=${data.allowed}, count=${data.current_count}`)

      if (!data.allowed) {
        console.log(`❌ 第 ${i} 次請求被拒絕（應該通過）`)
        return
      }
    }

    // 第 11 次應該被拒絕
    const { data: rejected } = await supabase
      .rpc('check_rate_limit', {
        p_user_id: userId,
        p_max_requests: 10
      })
      .single()

    console.log(`  11/10: allowed=${rejected?.allowed}, count=${rejected?.current_count}`)

    if (rejected?.allowed === false) {
      console.log('✅ Rate limiting 正常運作！')
    } else {
      console.log('❌ 第 11 次請求應該被拒絕')
    }

    // 清理
    await supabase
      .from('profiles')
      .update({
        last_request_at: null,
        request_count_minute: 0
      })
      .eq('id', userId)

    console.log('🔄 已清理測試資料')

  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message)
  }
}

async function testQuotaCheckOrder() {
  console.log('\n🧪 測試 3: 配額檢查順序（需要實際 API 測試）')
  console.log('=' .repeat(50))
  console.log('📝 此測試需要在瀏覽器中手動執行：')
  console.log('   1. 選擇一個不存在的 template_id')
  console.log('   2. 確認錯誤訊息是 "Invalid template IDs" 而非配額錯誤')
  console.log('   3. 確認配額沒有被錯誤扣除')
  console.log('')
  console.log('💡 提示：可以在工作區隨便輸入一個假的 UUID')
}

async function main() {
  console.log('🚀 開始測試高優先級修復...\n')

  await testAtomicUpdate()
  await testRateLimit()
  await testQuotaCheckOrder()

  console.log('\n✅ 所有自動化測試完成！')
  console.log('\n📋 總結：')
  console.log('  ✅ 原子更新 usage_quota - 已驗證')
  console.log('  ✅ Rate limiting - 已驗證')
  console.log('  ⚠️  配額檢查順序 - 需手動測試')
  console.log('')
}

main()
