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
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error(`[line/webhook] reply failed: ${res.status} ${body}`)
  }
}

export async function POST(req: Request) {
  if (!process.env.LINE_CHANNEL_SECRET || !process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.error('[line/webhook] LINE_CHANNEL_SECRET or LINE_CHANNEL_ACCESS_TOKEN is missing — set both in Vercel Project Settings → Environment Variables, then redeploy')
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature')

  if (!verifySignature(rawBody, signature)) {
    console.error('[line/webhook] signature verification failed — check LINE_CHANNEL_SECRET matches the channel this webhook belongs to')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    await handleEvents(rawBody)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[line/webhook] unhandled error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function handleEvents(rawBody: string) {
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
      .select('id, room_id, rooms(room_number)')
      .eq('profile_id', profile.id)
      .eq('status', 'active')
      .order('move_in_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    const activeTenant = rawTenant as unknown as { id: string; room_id: string; rooms: { room_number: string } | null } | null

    if (!activeTenant) {
      await replyText(event.replyToken, 'คุณไม่มีห้องพักที่ใช้งานอยู่ในระบบขณะนี้ กรุณาติดต่อผู้ดูแลหอพัก')
      continue
    }

    const { data: rawBills } = await supabase
      .from('bills')
      .select('billing_month, billing_year, rent_amount, electric_amount, water_amount, total_amount, status, due_date')
      .eq('tenant_id', activeTenant.id)
      .eq('status', 'unpaid')
      .order('billing_year', { ascending: true })
      .order('billing_month', { ascending: true })
    type UnpaidBill = {
      billing_month: number; billing_year: number
      rent_amount: number; electric_amount: number; water_amount: number; total_amount: number
      status: 'unpaid'; due_date: string | null
    }
    const unpaidBills = (rawBills ?? []) as UnpaidBill[]

    const roomLabel = activeTenant.rooms?.room_number ? `ห้อง ${activeTenant.rooms.room_number}` : ''
    const greeting = `สวัสดีคุณ ${profile.full_name}${roomLabel ? ` (${roomLabel})` : ''}`

    if (unpaidBills.length === 0) {
      await replyText(event.replyToken, `${greeting}\nไม่มียอดค้างชำระ ✅`)
      continue
    }

    // Units aren't stored on bills — pull them from the confirmed meter readings for this room
    const { data: rawReadings } = await supabase
      .from('meter_readings')
      .select('meter_type, units_used, reading_month, reading_year')
      .eq('room_id', activeTenant.room_id)
    type ReadingRow = { meter_type: 'electric' | 'water'; units_used: number; reading_month: number; reading_year: number }
    const unitsByPeriod: Record<string, { electric?: number; water?: number }> = {}
    for (const r of (rawReadings ?? []) as ReadingRow[]) {
      const key = `${r.reading_month}-${r.reading_year}`
      if (!unitsByPeriod[key]) unitsByPeriod[key] = {}
      unitsByPeriod[key][r.meter_type] = r.units_used
    }

    const total = unpaidBills.reduce((sum, b) => sum + b.total_amount, 0)
    const blocks = unpaidBills.map(b => {
      const isOverdue = getEffectiveBillStatus(b) === 'overdue'
      const label = billStatusConfig[getEffectiveBillStatus(b)].label
      const units = unitsByPeriod[`${b.billing_month}-${b.billing_year}`] ?? {}
      const eUnits = units.electric != null ? `${units.electric} หน่วย` : '—'
      const wUnits = units.water != null ? `${units.water} หน่วย` : '—'

      return `📅 ${monthNames[b.billing_month - 1]} ${b.billing_year}${isOverdue ? ` (${label})` : ''}\n`
        + `🏠 ค่าเช่า: ฿${b.rent_amount.toLocaleString('th-TH')}\n`
        + `⚡ ค่าไฟ: ${eUnits} = ฿${b.electric_amount.toLocaleString('th-TH')}\n`
        + `💧 ค่าน้ำ: ${wUnits} = ฿${b.water_amount.toLocaleString('th-TH')}\n`
        + `รวม: ฿${b.total_amount.toLocaleString('th-TH')}`
    })

    await replyText(
      event.replyToken,
      `${greeting}\nยอดค้างชำระรวม: ฿${total.toLocaleString('th-TH')}\n\n${blocks.join('\n\n')}`
    )
  }
}
