import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MeterManualForm from './MeterManualForm'
import type { OcrReading } from '@/lib/types/database'

type RoomOption = { id: string; room_number: string; floor: number | null; rent_price: number }
type ConfirmedEntry = { previous: number; current: number; input_method: 'manual' | 'ocr'; ocr_batch_id: string | null }

export default async function NewMeterPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; room?: string }>
}) {
  const { month: monthStr, year: yearStr, room: roomParam } = await searchParams
  const now = new Date()
  const defaultMonth = parseInt(monthStr ?? String(now.getMonth() + 1))
  const defaultYear  = parseInt(yearStr  ?? String(now.getFullYear()))

  const supabase = await createClient()

  // Only occupied rooms need meter readings
  const { data: rawRooms } = await supabase
    .from('rooms')
    .select('id, room_number, floor, rent_price')
    .eq('status', 'occupied')
    .order('room_number')
  const rooms: RoomOption[] = (rawRooms as unknown as RoomOption[]) ?? []

  const prevReadings: Record<string, { electric?: number; water?: number }> = {}
  const confirmedByRoom: Record<string, { electric?: ConfirmedEntry; water?: ConfirmedEntry }> = {}
  const ocrDraftByRoom: Record<string, { electric?: number; water?: number }> = {}
  let ocrBatchId: string | null = null

  if (rooms.length > 0) {
    const roomIds = rooms.map(r => r.id)

    const [{ data: confirmedRaw }, { data: prevRaw }, { data: ocrBatchRaw }] = await Promise.all([
      // Confirmed readings already saved for this exact room/month/year
      supabase
        .from('meter_readings')
        .select('room_id, meter_type, previous_reading, current_reading, input_method, ocr_batch_id')
        .in('room_id', roomIds)
        .eq('reading_month', defaultMonth)
        .eq('reading_year', defaultYear),
      // Most recent reading strictly BEFORE the selected month/year, for the "previous" fallback
      supabase
        .from('meter_readings')
        .select('room_id, meter_type, current_reading, reading_month, reading_year')
        .in('room_id', roomIds)
        .order('reading_year', { ascending: false })
        .order('reading_month', { ascending: false }),
      // Latest unconfirmed OCR draft for this month/year, if any
      supabase
        .from('ocr_batches')
        .select('id, raw_result')
        .eq('reading_month', defaultMonth)
        .eq('reading_year', defaultYear)
        .eq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    type ConfirmedRow = { room_id: string; meter_type: string; previous_reading: number; current_reading: number; input_method: 'manual' | 'ocr'; ocr_batch_id: string | null }
    for (const r of (confirmedRaw ?? []) as ConfirmedRow[]) {
      if (!confirmedByRoom[r.room_id]) confirmedByRoom[r.room_id] = {}
      const entry: ConfirmedEntry = { previous: r.previous_reading, current: r.current_reading, input_method: r.input_method, ocr_batch_id: r.ocr_batch_id }
      if (r.meter_type === 'electric') confirmedByRoom[r.room_id].electric = entry
      else confirmedByRoom[r.room_id].water = entry
    }

    type PrevRow = { room_id: string; meter_type: string; current_reading: number; reading_month: number; reading_year: number }
    for (const r of (prevRaw ?? []) as PrevRow[]) {
      const beforeMonth = r.reading_year < defaultYear || (r.reading_year === defaultYear && r.reading_month < defaultMonth)
      if (!beforeMonth) continue
      if (!prevReadings[r.room_id]) prevReadings[r.room_id] = {}
      if (r.meter_type === 'electric' && prevReadings[r.room_id].electric == null) {
        prevReadings[r.room_id].electric = r.current_reading
      }
      if (r.meter_type === 'water' && prevReadings[r.room_id].water == null) {
        prevReadings[r.room_id].water = r.current_reading
      }
    }

    if (ocrBatchRaw) {
      const batch = ocrBatchRaw as unknown as { id: string; raw_result: { readings: OcrReading[] } | null }
      ocrBatchId = batch.id
      const currentRoomIds = new Set(rooms.map(r => r.id))
      for (const r of batch.raw_result?.readings ?? []) {
        if (!r.room_id || !currentRoomIds.has(r.room_id)) continue
        ocrDraftByRoom[r.room_id] = { electric: r.electric, water: r.water }
      }
    }
  }

  return (
    <div className="p-8">
      <Link
        href="/admin/meters"
        className="inline-flex items-center gap-1.5 text-sm text-[#897362] hover:text-[#564334] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Back to Meter Readings
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#241912]">Manual Meter Entry</h1>
        <p className="text-sm text-[#897362] mt-1">Enter electricity and water readings for one room.</p>
      </div>

      <div>
        <MeterManualForm
          rooms={rooms}
          prevReadings={prevReadings}
          confirmedByRoom={confirmedByRoom}
          ocrDraftByRoom={ocrDraftByRoom}
          ocrBatchId={ocrBatchId}
          defaultMonth={defaultMonth}
          defaultYear={defaultYear}
          initialRoomId={roomParam}
        />
      </div>
    </div>
  )
}
