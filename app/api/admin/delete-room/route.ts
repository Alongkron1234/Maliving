import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// DELETE /api/admin/delete-room?id=<room_id>
// Removes all related records in FK-dependency order, then deletes the room.
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing room id' }, { status: 400 })

  const s = createAdminClient()

  // 1. payments → reference bills (bills reference rooms)
  const { data: billRows } = await s.from('bills').select('id').eq('room_id', id)
  const billIds = (billRows ?? []).map((b: { id: string }) => b.id)
  if (billIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (s as any).from('payments').delete().in('bill_id', billIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // 2. bills
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: billsErr } = await (s as any).from('bills').delete().eq('room_id', id)
  if (billsErr) return NextResponse.json({ error: billsErr.message }, { status: 400 })

  // 3. meter_readings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: meterErr } = await (s as any).from('meter_readings').delete().eq('room_id', id)
  if (meterErr) return NextResponse.json({ error: meterErr.message }, { status: 400 })

  // 4. maintenance_requests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: maintErr } = await (s as any).from('maintenance_requests').delete().eq('room_id', id)
  if (maintErr) return NextResponse.json({ error: maintErr.message }, { status: 400 })

  // 5. tenants
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: tenantErr } = await (s as any).from('tenants').delete().eq('room_id', id)
  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 400 })

  // 6. room itself
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: roomErr } = await (s as any).from('rooms').delete().eq('id', id)
  if (roomErr) return NextResponse.json({ error: roomErr.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}