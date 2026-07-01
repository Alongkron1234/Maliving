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
const headers = {
  'Content-Type': 'application/json',
  apikey: key,
  Authorization: `Bearer ${key}`,
}

// Step 1: Test minimal user creation (no metadata)
console.log('Step 1: Creating user (no metadata)...')
const r1 = await fetch(`${url}/auth/v1/admin/users`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    email: 'admin@maliving.com',
    password: 'Admin123456!',
    email_confirm: true,
  }),
})
const b1 = await r1.json()
console.log('Status:', r1.status)

if (!r1.ok) {
  console.log('Failed:', JSON.stringify(b1, null, 2))

  // Check if trigger exists
  console.log('\nStep 2: Checking if handle_new_user trigger exists...')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: triggerCheck, error: te } = await supabase
    .from('profiles')
    .select('id')
    .limit(0)

  console.log('profiles table accessible:', te ? 'NO - ' + te.message : 'YES')

  // Try inserting into profiles directly to test constraints
  console.log('\nStep 3: Testing direct profiles insert...')
  const testId = '00000000-0000-0000-0000-000000000001'
  const { error: insertError } = await supabase
    .from('profiles')
    .insert({ id: testId, full_name: 'Test', role: 'admin' })
  console.log('Direct insert result:', insertError ? insertError.message : 'OK')

  if (!insertError) {
    // Clean up test row
    await supabase.from('profiles').delete().eq('id', testId)
  }
} else {
  const userId = b1.id
  console.log('✓ User created, ID:', userId)

  // Step 2: Set app_metadata role = admin
  console.log('\nStep 2: Setting app_metadata.role = admin...')
  const r2 = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      app_metadata: { role: 'admin' },
    }),
  })
  const b2 = await r2.json()
  console.log('Status:', r2.status, r2.ok ? '✓' : '✗')

  // Step 3: Update profile (in case trigger created it with wrong role)
  console.log('\nStep 3: Updating profile role...')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: 'ผู้ดูแลระบบ', role: 'admin' })
    .eq('id', userId)
  console.log('Profile update:', profileError ? profileError.message : '✓')

  console.log('\n✅ Done!')
  console.log('  Email   : admin@maliving.com')
  console.log('  Password: Admin123456!')
}
