import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// One-time seed endpoint — creates 2 rooms + 2 tenants + last month's meter readings
// Hit GET /api/admin/seed once, then delete this file
export async function GET() {
  const supabase = createAdminClient()
  const now = new Date()
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()       // Jan → Dec
  const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  const log: string[] = []
  const errors: string[] = []

  // ── 1. Rooms ──────────────────────────────────────────────────────────
  const roomPayloads = [
    { room_number: '101', floor: 1, rent_price: 4500, status: 'occupied' },
    { room_number: '102', floor: 1, rent_price: 4500, status: 'occupied' },
  ]

  const insertedRooms: { id: string; room_number: string }[] = []
  for (const room of roomPayloads) {
    const { data, error } = await (supabase as any)
      .from('rooms')
      .upsert(room, { onConflict: 'room_number' })
      .select('id, room_number')
      .single()

    if (error) { errors.push(`room ${room.room_number}: ${error.message}`); continue }
    const r = data as { id: string; room_number: string }
    insertedRooms.push(r)
    log.push(`✓ room ${r.room_number} (${r.id})`)
  }

  if (insertedRooms.length < 2) {
    return NextResponse.json({ errors, log }, { status: 500 })
  }

  // ── 2. Auth users + profiles (via admin API — sets app_metadata.role) ─
  const tenantDefs = [
    { email: 'somchai.test@maliving.dev', full_name: 'สมชาย ใจดี', phone: '0812345678', roomIndex: 0 },
    { email: 'somying.test@maliving.dev', full_name: 'สมหญิง รักดี', phone: '0898765432', roomIndex: 1 },
  ]

  const insertedTenantIds: string[] = []

  for (const def of tenantDefs) {
    // createUser → trigger auto-creates profiles row
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: def.email,
      password: 'Maliving@1234',
      email_confirm: true,
      app_metadata: { role: 'tenant' },
      user_metadata: { full_name: def.full_name, phone: def.phone },
    })

    if (authErr) {
      // User might already exist — look up by email
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existing = listData?.users.find(u => u.email === def.email)
      if (!existing) { errors.push(`auth ${def.email}: ${authErr.message}`); continue }
      log.push(`~ user ${def.email} already exists`)

      // Ensure tenant record exists for this user
      const { data: tData } = await supabase
        .from('tenants')
        .select('id')
        .eq('profile_id', existing.id)
        .eq('room_id', insertedRooms[def.roomIndex].id)
        .eq('status', 'active')
        .maybeSingle()
      const t = tData as { id: string } | null
      if (t) { insertedTenantIds.push(t.id); continue }

      const { data: newT, error: tErr } = await (supabase as any)
        .from('tenants')
        .insert({ profile_id: existing.id, room_id: insertedRooms[def.roomIndex].id, move_in_date: '2025-01-01', status: 'active' })
        .select('id').single()
      if (tErr) { errors.push(`tenant for ${def.email}: ${tErr.message}`); continue }
      insertedTenantIds.push((newT as { id: string }).id)
      continue
    }

    const userId = authData.user.id
    log.push(`✓ auth user ${def.email} (${userId})`)

    // Give trigger a moment, then upsert profile to guarantee full_name + phone
    await new Promise(r => setTimeout(r, 300))
    await (supabase as any).from('profiles').upsert(
      { id: userId, full_name: def.full_name, phone: def.phone, role: 'tenant' },
      { onConflict: 'id' }
    )

    // Tenant record
    const { data: tData, error: tErr } = await (supabase as any)
      .from('tenants')
      .insert({ profile_id: userId, room_id: insertedRooms[def.roomIndex].id, move_in_date: '2025-01-01', status: 'active' })
      .select('id').single()

    if (tErr) { errors.push(`tenant ${def.full_name}: ${tErr.message}`); continue }
    const t = tData as { id: string }
    insertedTenantIds.push(t.id)
    log.push(`✓ tenant ${def.full_name} → room ${insertedRooms[def.roomIndex].room_number}`)
  }

  // ── 3. Previous month meter readings (so "เลขก่อน" auto-fills) ────────
  const prevReadings = [
    // Room 101
    { room_id: insertedRooms[0].id, meter_type: 'electric', reading_month: prevMonth, reading_year: prevYear, previous_reading: 0,   current_reading: 1234, input_method: 'manual', ocr_batch_id: null },
    { room_id: insertedRooms[0].id, meter_type: 'water',    reading_month: prevMonth, reading_year: prevYear, previous_reading: 0,   current_reading: 56,   input_method: 'manual', ocr_batch_id: null },
    // Room 102
    { room_id: insertedRooms[1].id, meter_type: 'electric', reading_month: prevMonth, reading_year: prevYear, previous_reading: 0,   current_reading: 2100, input_method: 'manual', ocr_batch_id: null },
    { room_id: insertedRooms[1].id, meter_type: 'water',    reading_month: prevMonth, reading_year: prevYear, previous_reading: 0,   current_reading: 78,   input_method: 'manual', ocr_batch_id: null },
  ]

  for (const r of prevReadings) {
    const { error } = await (supabase as any)
      .from('meter_readings')
      .upsert(r, { onConflict: 'room_id,meter_type,reading_month,reading_year' })

    if (error) errors.push(`meter ${r.room_id} ${r.meter_type}: ${error.message}`)
    else log.push(`✓ prev reading room ${r.room_id === insertedRooms[0].id ? '101' : '102'} ${r.meter_type} = ${r.current_reading}`)
  }

  return NextResponse.json({
    ok: errors.length === 0,
    summary: {
      rooms: insertedRooms.map(r => r.room_number),
      prevMonth: `${prevMonth}/${prevYear}`,
      tenantPassword: 'Maliving@1234',
    },
    log,
    errors,
  })
}