import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenant } from '@/lib/supabase/requireTenant'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: Request) {
  const { error: unauthorized, user } = await requireTenant()
  if (unauthorized) return unauthorized

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const bill_id = formData.get('bill_id') as string | null

  if (!file || !bill_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'ไฟล์ใหญ่เกินไป (สูงสุด 5MB)' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Resolve the caller's own active tenant record — never trust a tenant_id
  // from the client — and confirm the bill actually belongs to them.
  const { data: tenantRaw } = await admin
    .from('tenants')
    .select('id')
    .eq('profile_id', user!.id)
    .eq('status', 'active')
    .order('move_in_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  const tenant = tenantRaw as { id: string } | null
  if (!tenant) {
    return NextResponse.json({ error: 'ไม่พบข้อมูลผู้เช่าที่ active ของคุณ' }, { status: 403 })
  }

  const { data: billRaw } = await admin
    .from('bills')
    .select('id, tenant_id, total_amount, status')
    .eq('id', bill_id)
    .eq('tenant_id', tenant.id)
    .single()
  const bill = billRaw as { id: string; tenant_id: string; total_amount: number; status: string } | null
  if (!bill) {
    return NextResponse.json({ error: 'ไม่พบบิลนี้' }, { status: 404 })
  }
  if (bill.status !== 'unpaid') {
    return NextResponse.json({ error: 'บิลนี้ไม่ได้อยู่ในสถานะรอชำระ' }, { status: 400 })
  }

  // Block a second submission while one is already pending or already confirmed —
  // a rejected slip doesn't block a resubmit.
  const { data: existing } = await admin
    .from('payments')
    .select('id, status')
    .eq('bill_id', bill_id)
    .in('status', ['pending', 'confirmed'])
  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'บิลนี้มีสลิปที่ส่งไว้แล้ว รอการตรวจสอบจากผู้ดูแล' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${tenant.id}/${bill_id}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('payment-slips')
    .upload(path, buffer, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: `อัปโหลดไม่สำเร็จ: ${uploadError.message}` }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payment, error: insertError } = await (admin as any)
    .from('payments')
    .insert({
      bill_id,
      tenant_id: tenant.id,
      amount: bill.total_amount,
      method: 'qr',
      slip_url: path,
      status: 'pending',
    })
    .select()
    .single()

  if (insertError) {
    await admin.storage.from('payment-slips').remove([path])
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, payment })
}
