import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkDatabaseState() {
  console.log('📊 Checking database state...\n')

  // Check usage_logs
  const { data: logs, error: logsError } = await supabase
    .from('usage_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (logsError) {
    console.error('❌ Error fetching usage_logs:', logsError)
  } else {
    console.log('📝 usage_logs:')
    console.table(logs)
  }

  // Check usage_quota
  const { data: quota, error: quotaError } = await supabase
    .from('usage_quota')
    .select('*')

  if (quotaError) {
    console.error('❌ Error fetching usage_quota:', quotaError)
  } else {
    console.log('\n💾 usage_quota:')
    console.table(quota)
  }
}

checkDatabaseState().catch(console.error)
