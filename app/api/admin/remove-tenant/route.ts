import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { tenant_id, profile_id, room_id } = await req.json()

  if (!tenant_id || !profile_id || !room_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1. Set tenant inactive
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: tenantError } = await (supabase as any)
    .from('tenants')
    .update({ status: 'inactive', move_out_date: new Date().toISOString().slice(0, 10) })
    .eq('id', tenant_id)

  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 400 })
  }

  // 2. Check if any other active tenants remain in this room
  const { count } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room_id)
    .eq('status', 'active')

  if ((count ?? 0) === 0) {
    // No more active tenants — set room back to available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('rooms')
      .update({ status: 'available', updated_at: new Date().toISOString() })
      .eq('id', room_id)
  }

  // 3. Delete the auth user (removes the Supabase login account)
  await supabase.auth.admin.deleteUser(profile_id)

  return NextResponse.json({ ok: true })
}