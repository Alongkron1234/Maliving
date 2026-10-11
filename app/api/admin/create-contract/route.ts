import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/requireAdmin'

export async function POST(req: Request) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

  const { tenant_id, start_date, end_date, rent_amount, deposit_amount } = await req.json()

  if (!tenant_id || !start_date || !end_date || rent_amount == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (end_date <= start_date) {
    return NextResponse.json({ error: 'วันสิ้นสุดสัญญาต้องหลังวันเริ่มสัญญา' }, { status: 400 })
  }
  const deposit = deposit_amount ?? 0
  if (!Number.isInteger(rent_amount) || rent_amount < 0 || !Number.isInteger(deposit) || deposit < 0) {
    return NextResponse.json({ error: 'ค่าเช่าและเงินมัดจำต้องเป็นจำนวนเต็มบาท' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // The room comes from the tenant record on the server — never trust a room_id sent by the browser
  const { data: tenantRaw } = await supabase
    .from('tenants')
    .select('id, room_id, status')
    .eq('id', tenant_id)
    .single()
  const tenant = tenantRaw as { id: string; room_id: string; status: string } | null
  if (!tenant || tenant.status !== 'active') {
    return NextResponse.json({ error: 'ไม่พบผู้เช่าที่ยังพักอยู่' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('contracts')
    .insert({
      tenant_id,
      room_id: tenant.room_id,
      start_date,
      end_date,
      rent_amount,
      deposit_amount: deposit,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    // 23505 = unique violation, i.e. the "one active contract per tenant" index said no
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'ผู้เช่าคนนี้มีสัญญาที่ยังมีผลอยู่แล้ว ให้ต่อสัญญาหรือยกเลิกฉบับเดิมก่อน' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, contract: data })
}
