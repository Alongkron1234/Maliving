import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/requireAdmin'

export async function POST(req: Request) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

  const { payment_id, decision, note } = await req.json()

  if (!payment_id || !['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: { user } } = await (await createClient()).auth.getUser()

  const { data: paymentRaw } = await supabase
    .from('payments')
    .select('id, bill_id, status')
    .eq('id', payment_id)
    .single()
  const payment = paymentRaw as { id: string; bill_id: string; status: string } | null

  if (!payment) {
    return NextResponse.json({ error: 'ไม่พบรายการชำระเงินนี้' }, { status: 404 })
  }
  if (payment.status !== 'pending') {
    return NextResponse.json({ error: 'รายการนี้ถูกตรวจสอบไปแล้ว' }, { status: 400 })
  }

  const newStatus = decision === 'approve' ? 'confirmed' : 'rejected'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (supabase as any)
    .from('payments')
    .update({
      status: newStatus,
      note: note || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
    })
    .eq('id', payment_id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  if (decision === 'approve') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: billErr } = await (supabase as any)
      .from('bills')
      .update({ status: 'paid' })
      .eq('id', payment.bill_id)

    if (billErr) {
      // Roll back the approval so we never leave a "confirmed" payment whose bill is still unpaid
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('payments')
        .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
        .eq('id', payment_id)
      return NextResponse.json({ error: billErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
