import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// DELETE /api/admin/delete-bill?id=<bill_id>
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing bill id' }, { status: 400 })

  const s = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: paymentsErr } = await (s as any).from('payments').delete().eq('bill_id', id)
  if (paymentsErr) return NextResponse.json({ error: paymentsErr.message }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: billErr } = await (s as any).from('bills').delete().eq('id', id)
  if (billErr) return NextResponse.json({ error: billErr.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}