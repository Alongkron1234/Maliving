import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { full_name, phone, email, password, room_id, move_in_date } = await req.json()

  if (!full_name || !email || !password || !room_id || !move_in_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1. Create Supabase Auth user — trigger handle_new_user() auto-creates profiles row
  const { data: userData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'tenant' },
    user_metadata: { full_name, phone: phone || null },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const profile_id = userData.user.id

  // 1b. The trigger only inserts id/full_name/role — explicitly write phone to profiles
  if (phone) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('profiles').update({ phone }).eq('id', profile_id)
  }

  // 2. Insert tenant record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: tenantError } = await (supabase as any)
    .from('tenants')
    .insert({ profile_id, room_id, move_in_date, status: 'active' })

  if (tenantError) {
    // Rollback: remove auth user so we don't leave orphaned accounts
    await supabase.auth.admin.deleteUser(profile_id)
    return NextResponse.json({ error: tenantError.message }, { status: 400 })
  }

  // 3. Update room status → occupied
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('rooms')
    .update({ status: 'occupied', updated_at: new Date().toISOString() })
    .eq('id', room_id)

  return NextResponse.json({ ok: true, profile_id })
}