import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function addTokenColumns() {
  console.log('🔄 Adding token usage columns to usage_logs table...\n')

  try {
    // Check if columns already exist by trying to select them
    const { error: checkError } = await supabase
      .from('usage_logs')
      .select('input_tokens, output_tokens, total_tokens')
      .limit(1)

    if (!checkError) {
      console.log('✅ Columns already exist!')
      return
    }

    console.log('⚠️  Columns do not exist. Manual migration required.')
    console.log('\nPlease run this SQL in Supabase SQL Editor:\n')
    console.log('----------------------------------------')
    console.log('ALTER TABLE public.usage_logs')
    console.log('ADD COLUMN input_tokens INTEGER DEFAULT 0,')
    console.log('ADD COLUMN output_tokens INTEGER DEFAULT 0,')
    console.log('ADD COLUMN total_tokens INTEGER DEFAULT 0;')
    console.log('----------------------------------------\n')
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

addTokenColumns().catch(console.error)
