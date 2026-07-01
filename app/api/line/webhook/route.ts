import { createAdminClient } from '@/lib/supabase/admin'
import { billStatusConfig, getEffectiveBillStatus } from '@/lib/bills'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

type LineEvent = {
  type: string
  replyToken?: string
  message?: { type: string; text?: string }
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false
  const hash = crypto
    .createHmac('sha256', process.env.LINE_CHANNEL_SECRET!)
    .update(rawBody)
    .digest('base64')
  return hash === signature
}

function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('66')) digits = '0' + digits.slice(2)
  return digits
}

async function replyText(replyToken: string, text: string) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  })
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature')

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { events } = JSON.parse(rawBody) as { events: LineEvent[] }
  const supabase = createAdminClient()

  for (const event of events) {
    if (event.type !== 'message' || !event.replyToken) continue

    if (event.message?.type !== 'text' || !event.message.text) {
      await replyText(event.replyToken, 'พิมพ์เบอร์โทรที่ลงทะเบียนไว้กับหอพัก เพื่อเช็คยอดบิลที่ต้องชำระ')
      continue
    }

    const targetPhone = normalizePhone(event.message.text)
    if (!targetPhone) {
      await replyText(event.replyToken, 'พิมพ์เบอร์โทรที่ลงทะเบียนไว้กับหอพัก เพื่อเช็คยอดบิลที่ต้องชำระ')
      continue
    }

    const { data: rawProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('role', 'tenant')
      .not('phone', 'is', null)
    const profiles = (rawProfiles ?? []) as { id: string; full_name: string; phone: string }[]
    const matches = profiles.filter(p => normalizePhone(p.phone) === targetPhone)

    if (matches.length === 0) {
      await replyText(event.replyToken, 'ไม่พบเบอร์นี้ในระบบ กรุณาตรวจสอบเบอร์โทรที่ลงทะเบียนไว้กับผู้ดูแลหอพัก')
      continue
    }
    if (matches.length > 1) {
      await replyText(event.replyToken, 'พบข้อมูลมากกว่า 1 รายการสำหรับเบอร์นี้ กรุณาติดต่อผู้ดูแลหอพักโดยตรง')
      continue
    }

    const profile = matches[0]

    const { data: rawTenant } = await supabase
      .from('tenants')
      .select('id, rooms(room_number)')
      .eq('profile_id', profile.id)
      .eq('status', 'active')
      .order('move_in_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    const activeTenant = rawTenant as unknown as { id: string; rooms: { room_number: string } | null } | null

    if (!activeTenant) {
      await replyText(event.replyToken, 'คุณไม่มีห้องพักที่ใช้งานอยู่ในระบบขณะนี้ กรุณาติดต่อผู้ดูแลหอพัก')
      continue
    }

    const { data: rawBills } = await supabase
      .from('bills')
      .select('billing_month, billing_year, total_amount, status, due_date')
      .eq('tenant_id', activeTenant.id)
      .eq('status', 'unpaid')
      .order('billing_year', { ascending: true })
      .order('billing_month', { ascending: true })
    type UnpaidBill = { billing_month: number; billing_year: number; total_amount: number; status: 'unpaid'; due_date: string | null }
    const unpaidBills = (rawBills ?? []) as UnpaidBill[]

    const roomLabel = activeTenant.rooms?.room_number ? `ห้อง ${activeTenant.rooms.room_number}` : ''
    const greeting = `สวัสดีคุณ ${profile.full_name}${roomLabel ? ` (${roomLabel})` : ''}`

    if (unpaidBills.length === 0) {
      await replyText(event.replyToken, `${greeting}\nไม่มียอดค้างชำระ ✅`)
      continue
    }

    const total = unpaidBills.reduce((sum, b) => sum + b.total_amount, 0)
    const lines = unpaidBills.map(b => {
      const isOverdue = getEffectiveBillStatus(b) === 'overdue'
      const label = billStatusConfig[getEffectiveBillStatus(b)].label
      return `- ${monthNames[b.billing_month - 1]} ${b.billing_year}: ฿${b.total_amount.toLocaleString('th-TH')}${isOverdue ? ` (${label})` : ''}`
    })

    await replyText(
      event.replyToken,
      `${greeting}\nยอดค้างชำระรวม: ฿${total.toLocaleString('th-TH')}\n\n${lines.join('\n')}`
    )
  }

  return NextResponse.json({ ok: true })
}
