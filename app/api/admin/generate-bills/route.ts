import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { month, year, electric_rate, water_rate, room_id } = await req.json()

  const reading_month = parseInt(month)
  const reading_year = parseInt(year)
  const eRate = parseFloat(electric_rate)
  const wRate = parseFloat(water_rate)

  if (!reading_month || reading_month < 1 || reading_month > 12 || !reading_year) {
    return NextResponse.json({ error: 'Missing or invalid month/year' }, { status: 400 })
  }
  if (isNaN(eRate) || isNaN(wRate) || eRate < 0 || wRate < 0) {
    return NextResponse.json({ error: 'Missing or invalid electric/water rate' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const [{ data: roomsRaw }, { data: tenantsRaw }, { data: readingsRaw }, { data: existingBillsRaw }] = await Promise.all([
    supabase.from('rooms').select('id, room_number, rent_price'),
    supabase
      .from('tenants')
      .select('id, room_id, move_in_date')
      .eq('status', 'active')
      .order('move_in_date', { ascending: true }),
    supabase
      .from('meter_readings')
      .select('room_id, meter_type, units_used')
      .eq('reading_month', reading_month)
      .eq('reading_year', reading_year),
    supabase
      .from('bills')
      .select('room_id, status')
      .eq('billing_month', reading_month)
      .eq('billing_year', reading_year),
  ])

  type RoomRow = { id: string; room_number: string; rent_price: number }
  type TenantRow = { id: string; room_id: string; move_in_date: string }
  type ReadingRow = { room_id: string; meter_type: string; units_used: number }
  type BillRow = { room_id: string; status: string }

  const rooms = ((roomsRaw ?? []) as RoomRow[]).filter(r => !room_id || r.id === room_id)
  const tenants = (tenantsRaw ?? []) as TenantRow[]
  const readings = (readingsRaw ?? []) as ReadingRow[]
  const existingBills = (existingBillsRaw ?? []) as BillRow[]

  const paidRoomIds = new Set(existingBills.filter(b => b.status === 'paid').map(b => b.room_id))

  // Earliest active tenant per room (rooms can have more than one active tenant)
  const earliestTenantByRoom: Record<string, TenantRow> = {}
  for (const t of tenants) {
    if (!earliestTenantByRoom[t.room_id]) earliestTenantByRoom[t.room_id] = t
  }

  const readingsByRoom: Record<string, { electric?: number; water?: number }> = {}
  for (const r of readings) {
    if (!readingsByRoom[r.room_id]) readingsByRoom[r.room_id] = {}
    if (r.meter_type === 'electric') readingsByRoom[r.room_id].electric = r.units_used
    else readingsByRoom[r.room_id].water = r.units_used
  }

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 7)
  const due_date = dueDate.toISOString().slice(0, 10)

  const records: {
    room_id: string
    tenant_id: string
    billing_month: number
    billing_year: number
    rent_amount: number
    electric_amount: number
    water_amount: number
    status: 'unpaid'
    due_date: string
  }[] = []
  const errors: { room: string; reason: string }[] = []

  for (const room of rooms) {
    if (paidRoomIds.has(room.id)) {
      errors.push({ room: room.room_number, reason: 'บิลนี้ชำระแล้ว ข้ามการสร้างใหม่' })
      continue
    }

    const tenant = earliestTenantByRoom[room.id]
    if (!tenant) {
      errors.push({ room: room.room_number, reason: 'ไม่มีผู้เช่า' })
      continue
    }

    const roomReadings = readingsByRoom[room.id]
    const hasElectric = roomReadings?.electric != null
    const hasWater = roomReadings?.water != null
    if (!hasElectric || !hasWater) {
      const reason = !hasElectric && !hasWater
        ? 'ไม่มีข้อมูลมิเตอร์ไฟฟ้าและน้ำ'
        : !hasElectric
          ? 'ไม่มีข้อมูลมิเตอร์ไฟฟ้า'
          : 'ไม่มีข้อมูลมิเตอร์น้ำ'
      errors.push({ room: room.room_number, reason })
      continue
    }

    records.push({
      room_id: room.id,
      tenant_id: tenant.id,
      billing_month: reading_month,
      billing_year: reading_year,
      rent_amount: room.rent_price,
      electric_amount: Math.round(roomReadings!.electric! * eRate),
      water_amount: Math.round(roomReadings!.water! * wRate),
      status: 'unpaid',
      due_date,
    })
  }

  if (records.length === 0) {
    return NextResponse.json({ bills: [], errors })
  }

  // Upsert so regenerating after a corrected meter reading recomputes amounts safely.
  // Already-paid rooms are excluded above so a regenerate can never silently un-pay a bill.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: billsRaw, error } = await (supabase as any)
    .from('bills')
    .upsert(records, { onConflict: 'room_id,billing_month,billing_year' })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ bills: billsRaw ?? [], errors })
}