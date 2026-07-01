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

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY

const res = await fetch(`${url}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({
    email: 'admin@maliving.com',
    password: 'Admin123456!',
    app_metadata: { role: 'admin' },
    user_metadata: { full_name: 'ผู้ดูแลระบบ', role: 'admin' },
    email_confirm: true,
  }),
})

const body = await res.json()
if (res.ok) {
  console.log('✓ Admin created!')
  console.log('  Email   : admin@maliving.com')
  console.log('  Password: Admin123456!')
  console.log('  ID      :', body.id)
} else {
  console.error('Error:', JSON.stringify(body, null, 2))
}
