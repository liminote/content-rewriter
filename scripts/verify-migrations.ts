/**
 * 驗證 Supabase Migrations 是否已執行
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 載入環境變數
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function verifyMigrations() {
  console.log('🔍 檢查 Supabase Migrations 執行狀態...\n')
  console.log('=' .repeat(60))

  let allPassed = true

  // 檢查 1: increment_usage_count 函數是否存在
  console.log('\n📋 檢查 1: increment_usage_count 函數')
  try {
    const { data: functions, error } = await supabase
      .rpc('increment_usage_count', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // 假的 UUID
        p_increment: 0
      })

    if (error) {
      if (error.message.includes('Could not find the function')) {
        console.log('❌ 函數不存在 - Migration 007 尚未執行')
        allPassed = false
      } else {
        console.log('✅ 函數存在（錯誤是因為測試用的假 UUID）')
      }
    } else {
      console.log('✅ 函數存在且可正常調用')
    }
  } catch (error: any) {
    console.log('❌ 檢查失敗:', error.message)
    allPassed = false
  }

  // 檢查 2: check_rate_limit 函數是否存在
  console.log('\n📋 檢查 2: check_rate_limit 函數')
  try {
    const { data, error } = await supabase
      .rpc('check_rate_limit', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // 假的 UUID
        p_max_requests: 10
      })

    if (error) {
      if (error.message.includes('Could not find the function')) {
        console.log('❌ 函數不存在 - Migration 008 尚未執行')
        allPassed = false
      } else {
        console.log('✅ 函數存在（錯誤是因為測試用的假 UUID）')
      }
    } else {
      console.log('✅ 函數存在且可正常調用')
    }
  } catch (error: any) {
    console.log('❌ 檢查失敗:', error.message)
    allPassed = false
  }

  // 檢查 3: profiles 表是否有新欄位
  console.log('\n📋 檢查 3: profiles 表新欄位')
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('last_request_at, request_count_minute')
      .limit(1)

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ 欄位不存在 - Migration 008 尚未執行')
        allPassed = false
      } else {
        console.log('❌ 查詢失敗:', error.message)
        allPassed = false
      }
    } else {
      console.log('✅ last_request_at 和 request_count_minute 欄位存在')
    }
  } catch (error: any) {
    console.log('❌ 檢查失敗:', error.message)
    allPassed = false
  }

  // 總結
  console.log('\n' + '='.repeat(60))
  if (allPassed) {
    console.log('\n✅ 所有 Migrations 已正確執行！')
    console.log('\n📝 確認項目：')
    console.log('  ✅ Migration 007: increment_usage_count 函數')
    console.log('  ✅ Migration 008: check_rate_limit 函數')
    console.log('  ✅ Migration 008: profiles 表新欄位')
    console.log('\n🎉 系統已準備好部署到 Production！')
  } else {
    console.log('\n❌ 部分 Migrations 尚未執行')
    console.log('\n📝 請在 Supabase Dashboard 執行以下檔案：')
    console.log('  - supabase/migrations/007_atomic_quota_update.sql')
    console.log('  - supabase/migrations/008_add_rate_limiting.sql')
  }

  console.log('')
}

verifyMigrations()
