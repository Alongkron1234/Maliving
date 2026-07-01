import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const VALID_METHODS = ['cash', 'transfer', 'qr']

export async function POST(req: Request) {
  const { bill_id, method, paid_at } = await req.json()

  if (!bill_id || !method) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!VALID_METHODS.includes(method)) {
    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: billRaw, error: billErr } = await supabase
    .from('bills')
    .select('id, tenant_id, total_amount, status')
    .eq('id', bill_id)
    .single()

  if (billErr || !billRaw) {
    return NextResponse.json({ error: 'Bill not found' }, { status: 400 })
  }
  const bill = billRaw as unknown as { id: string; tenant_id: string; total_amount: number; status: string }

  if (bill.status !== 'unpaid') {
    return NextResponse.json({ error: 'บิลนี้ชำระแล้ว' }, { status: 400 })
  }

  const { data: existingPayments } = await supabase
    .from('payments')
    .select('id')
    .eq('bill_id', bill_id)
  if (existingPayments && existingPayments.length > 0) {
    return NextResponse.json({ error: 'บิลนี้มีการชำระเงินบันทึกไว้แล้ว' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: paymentRaw, error: paymentErr } = await (supabase as any)
    .from('payments')
    .insert({
      bill_id,
      tenant_id: bill.tenant_id,
      amount: bill.total_amount,
      method,
      paid_at: paid_at ? new Date(paid_at).toISOString() : new Date().toISOString(),
      slip_url: null,
    })
    .select()
    .single()

  if (paymentErr || !paymentRaw) {
    return NextResponse.json({ error: paymentErr?.message ?? 'Failed to record payment' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (supabase as any)
    .from('bills')
    .update({ status: 'paid' })
    .eq('id', bill_id)

  if (updateErr) {
    // Roll back the payment so we never leave a payment record with a bill still 'unpaid'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('payments').delete().eq('id', paymentRaw.id)
    return NextResponse.json({ error: updateErr.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, payment: paymentRaw })
}

// DELETE /api/admin/record-payment?bill_id=<bill_id>
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const bill_id = searchParams.get('bill_id')
  if (!bill_id) return NextResponse.json({ error: 'Missing bill_id' }, { status: 400 })

  const s = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteErr } = await (s as any).from('payments').delete().eq('bill_id', bill_id)
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (s as any).from('bills').update({ status: 'unpaid' }).eq('id', bill_id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
