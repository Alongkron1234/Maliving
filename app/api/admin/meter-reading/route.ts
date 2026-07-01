import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const {
    room_id,
    reading_month,
    reading_year,
    electric_previous,
    electric_current,
    electric_input_method,
    electric_ocr_batch_id,
    water_previous,
    water_current,
    water_input_method,
    water_ocr_batch_id,
  } = await req.json()

  if (!room_id || !reading_month || !reading_year ||
      electric_current == null || water_current == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const records = [
    {
      room_id,
      meter_type: 'electric',
      reading_month,
      reading_year,
      previous_reading: electric_previous ?? 0,
      current_reading: electric_current,
      input_method: electric_input_method === 'ocr' ? 'ocr' : 'manual',
      ocr_batch_id: electric_ocr_batch_id ?? null,
    },
    {
      room_id,
      meter_type: 'water',
      reading_month,
      reading_year,
      previous_reading: water_previous ?? 0,
      current_reading: water_current,
      input_method: water_input_method === 'ocr' ? 'ocr' : 'manual',
      ocr_batch_id: water_ocr_batch_id ?? null,
    },
  ]

  // Upsert so re-opening an already-saved room (e.g. to fix a wrong OCR read)
  // updates the existing row instead of failing on the unique constraint.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('meter_readings')
    .upsert(records, { onConflict: 'room_id,meter_type,reading_month,reading_year' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const room_id      = searchParams.get('room_id')
  const reading_month = parseInt(searchParams.get('month') ?? '')
  const reading_year  = parseInt(searchParams.get('year') ?? '')

  if (!room_id || !reading_month || !reading_year) {
    return NextResponse.json({ error: 'Missing room_id, month, or year' }, { status: 400 })
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('meter_readings')
    .delete()
    .eq('room_id', room_id)
    .eq('reading_month', reading_month)
    .eq('reading_year', reading_year)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}