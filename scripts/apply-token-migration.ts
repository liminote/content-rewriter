import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import * as fs from 'fs'

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

async function applyMigration() {
  console.log('🔄 Applying token usage migration...\n')

  const migrationSQL = fs.readFileSync(
    resolve(__dirname, '../supabase/migrations/006_add_token_usage.sql'),
    'utf-8'
  )

  const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

  if (error) {
    console.error('❌ Migration failed:', error)
    // Try alternative approach
    console.log('\n🔄 Trying alternative approach...')

    const statements = [
      'ALTER TABLE public.usage_logs ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0',
      'ALTER TABLE public.usage_logs ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0',
      'ALTER TABLE public.usage_logs ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0'
    ]

    for (const sql of statements) {
      const { error: stmtError } = await supabase.rpc('exec_sql', { sql })
      if (stmtError) {
        console.error(`❌ Failed to execute: ${sql}`)
        console.error(stmtError)
      } else {
        console.log(`✅ Executed: ${sql}`)
      }
    }
  } else {
    console.log('✅ Migration applied successfully!')
  }
}

applyMigration().catch(console.error)
