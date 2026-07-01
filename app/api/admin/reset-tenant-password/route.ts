import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { profile_id, password } = await req.json()

  if (!profile_id || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.updateUserById(profile_id, { password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}