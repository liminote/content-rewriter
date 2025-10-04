import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function resetUsageData() {
  console.log('🔄 Starting usage data reset...\n')

  // 1. Reset usage_quota
  console.log('1️⃣ Resetting usage_quota table...')
  const { error: quotaError } = await supabase
    .from('usage_quota')
    .update({
      usage_count: 0,
      current_month: new Date().toISOString().slice(0, 7), // YYYY-MM
      updated_at: new Date().toISOString(),
    })
    .neq('id', '00000000-0000-0000-0000-000000000000') // Update all rows

  if (quotaError) {
    console.error('❌ Error resetting usage_quota:', quotaError)
  } else {
    console.log('✅ usage_quota reset complete')
  }

  // 2. Clear usage_logs
  console.log('\n2️⃣ Clearing usage_logs table...')
  const { error: logsError } = await supabase
    .from('usage_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

  if (logsError) {
    console.error('❌ Error clearing usage_logs:', logsError)
  } else {
    console.log('✅ usage_logs cleared')
  }

  // 3. Clear history
  console.log('\n3️⃣ Clearing history table...')
  const { error: historyError } = await supabase
    .from('history')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

  if (historyError) {
    console.error('❌ Error clearing history:', historyError)
  } else {
    console.log('✅ history cleared')
  }

  console.log('\n✨ Reset complete!')
}

resetUsageData().catch(console.error)
