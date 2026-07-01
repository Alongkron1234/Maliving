import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envRaw = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
const env = {}
for (const line of envRaw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Test basic DB connection
const { data, error } = await supabase.from('profiles').select('id').limit(1)

if (error) {
  console.log('DB Error:', error.message)
} else {
  console.log('✓ Database connected! profiles rows:', data?.length ?? 0)
}

// Test admin auth API
const { data: users, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1 })
if (authError) {
  console.log('Auth Admin Error:', authError.message, '| status:', authError.status)
} else {
  console.log('✓ Admin Auth API works! Total users:', users?.users?.length ?? 0)
}
