import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/requireAdmin'

export async function POST(req: Request) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

  const { contract_id, new_end_date, rent_amount } = await req.json()
  if (!contract_id || !new_end_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: oldRaw } = await supabase.from('contracts').select('*').eq('id', contract_id).single()
  const old = oldRaw as {
    id: string
    tenant_id: string
    room_id: string
    end_date: string
    rent_amount: number
    deposit_amount: number
    status: string
  } | null

  if (!old) return NextResponse.json({ error: 'ไม่พบสัญญานี้' }, { status: 404 })
  if (old.status !== 'active') {
    return NextResponse.json({ error: 'ต่อสัญญาได้เฉพาะสัญญาที่ยังมีผลอยู่' }, { status: 400 })
  }
  if (new_end_date <= old.end_date) {
    return NextResponse.json({ error: 'วันสิ้นสุดใหม่ต้องหลังวันสิ้นสุดเดิม' }, { status: 400 })
  }
  const newRent = rent_amount ?? old.rent_amount
  if (!Number.isInteger(newRent) || newRent < 0) {
    return NextResponse.json({ error: 'ค่าเช่าต้องเป็นจำนวนเต็มบาท' }, { status: 400 })
  }

  // Order matters: the "one active contract per tenant" index would reject the new row while
  // the old one is still 'active', so close the old one first, then insert the new one.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: closed, error: closeErr } = await (supabase as any)
    .from('contracts')
    .update({ status: 'renewed', updated_at: new Date().toISOString() })
    .eq('id', old.id)
    .eq('status', 'active')
    .select()
  if (closeErr) return NextResponse.json({ error: closeErr.message }, { status: 400 })
  if (!closed || closed.length === 0) {
    // Someone else (or a double-click) already changed it between our read and our write
    return NextResponse.json({ error: 'สัญญานี้ถูกเปลี่ยนสถานะไปแล้ว กรุณารีเฟรชหน้า' }, { status: 409 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created, error: insertErr } = await (supabase as any)
    .from('contracts')
    .insert({
      tenant_id: old.tenant_id,
      room_id: old.room_id,
      start_date: old.end_date,
      end_date: new_end_date,
      rent_amount: newRent,
      deposit_amount: old.deposit_amount,
      status: 'active',
      renewed_from: old.id,
    })
    .select()
    .single()

  if (insertErr) {
    // Put the old contract back so the tenant is never left with no active contract
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('contracts').update({ status: 'active' }).eq('id', old.id)
    return NextResponse.json({ error: insertErr.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, contract: created })
}
