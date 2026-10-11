import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/requireAdmin'

export async function POST(req: Request) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

  const { contract_id, note } = await req.json()
  if (!contract_id) return NextResponse.json({ error: 'Missing contract_id' }, { status: 400 })

  const supabase = createAdminClient()

  // The .eq('status', 'active') makes this a safe "compare and set": only an active
  // contract can be terminated, and a second click updates nothing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('contracts')
    .update({
      status: 'terminated',
      terminated_at: new Date().toISOString(),
      termination_note: note || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contract_id)
    .eq('status', 'active')
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'ยกเลิกได้เฉพาะสัญญาที่ยังมีผลอยู่' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
