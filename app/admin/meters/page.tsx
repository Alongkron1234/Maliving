import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Camera } from 'lucide-react'
import type { MeterReading, OcrReading } from '@/lib/types/database'
import MeterMonthFilter from './MeterMonthFilter'
import RateSettings from './RateSettings'
import MeterTable from './MeterTable'

type RoomRow = { id: string; room_number: string; floor: number | null }
type PrevRow  = { room_id: string; meter_type: string; current_reading: number; reading_month: number; reading_year: number }

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default async function MetersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const { month: monthStr, year: yearStr } = await searchParams
  const now = new Date()
  const month = parseInt(monthStr ?? String(now.getMonth() + 1))
  const year  = parseInt(yearStr  ?? String(now.getFullYear()))

  const supabase = await createClient()

  const [{ data: rawRooms }, { data: rawReadings }, { data: rawPrevAll }, { data: rawOcrBatch }] = await Promise.all([
    supabase.from('rooms').select('id, room_number, floor').order('room_number'),
    supabase
      .from('meter_readings')
      .select('*')
      .eq('reading_month', month)
      .eq('reading_year', year),
    // All readings before the selected month (for "เลขก่อน" fallback)
    supabase
      .from('meter_readings')
      .select('room_id, meter_type, current_reading, reading_month, reading_year')
      .order('reading_year',  { ascending: false })
      .order('reading_month', { ascending: false }),
    // Latest unconfirmed OCR draft for this month/year, if any
    supabase
      .from('ocr_batches')
      .select('id, raw_result')
      .eq('reading_month', month)
      .eq('reading_year', year)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const rooms: RoomRow[]      = (rawRooms    as unknown as RoomRow[])    ?? []
  const readings: MeterReading[] = (rawReadings as unknown as MeterReading[]) ?? []
  const prevAll: PrevRow[]    = (rawPrevAll  as unknown as PrevRow[])   ?? []

  // Draft readings from the latest OCR batch, matched by room_id (not room_number —
  // a deleted-then-recreated room with the same number must not inherit a stale draft).
  // These are not in meter_readings yet — admin must open the room and confirm.
  const ocrDraftByRoom: Record<string, { electric?: number; water?: number }> = {}
  if (rawOcrBatch) {
    const batch = rawOcrBatch as unknown as { id: string; raw_result: { readings: OcrReading[] } | null }
    const currentRoomIds = new Set(rooms.map(r => r.id))
    for (const r of batch.raw_result?.readings ?? []) {
      if (!r.room_id || !currentRoomIds.has(r.room_id)) continue
      ocrDraftByRoom[r.room_id] = { electric: r.electric, water: r.water }
    }
  }

  // Pivot current-month readings
  const readingsByRoom: Record<string, { electric?: MeterReading; water?: MeterReading }> = {}
  for (const r of readings) {
    if (!readingsByRoom[r.room_id]) readingsByRoom[r.room_id] = {}
    if (r.meter_type === 'electric') readingsByRoom[r.room_id].electric = r
    else readingsByRoom[r.room_id].water = r
  }

  // Most recent reading BEFORE the selected month, per room+type
  const prevByRoom: Record<string, { electric?: number; water?: number }> = {}
  for (const r of prevAll) {
    const beforeMonth = r.reading_year < year || (r.reading_year === year && r.reading_month < month)
    if (!beforeMonth) continue
    if (!prevByRoom[r.room_id]) prevByRoom[r.room_id] = {}
    if (r.meter_type === 'electric' && prevByRoom[r.room_id].electric == null) {
      prevByRoom[r.room_id].electric = r.current_reading
    }
    if (r.meter_type === 'water' && prevByRoom[r.room_id].water == null) {
      prevByRoom[r.room_id].water = r.current_reading
    }
  }

  const withReadings    = rooms.filter(r =>  readingsByRoom[r.id]?.electric || readingsByRoom[r.id]?.water)
  const withoutReadings = rooms.filter(r => !readingsByRoom[r.id]?.electric && !readingsByRoom[r.id]?.water)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#241912]">Meter Readings</h1>
          <p className="text-sm text-[#897362] mt-1">
            Water &amp; electricity readings for {MONTH_NAMES[month - 1]} {year}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/meters/upload"
            className="flex items-center gap-2 border border-[#ddc1ae] text-[#564334] text-sm font-semibold px-4 py-2.5 rounded-lg hover:border-[#904d00] hover:text-[#904d00] transition-colors"
          >
            <Camera size={15} />
            Upload Photo (OCR)
          </Link>
          <Link
            href={`/admin/meters/new?month=${month}&year=${year}`}
            className="flex items-center gap-2 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Manual Entry
          </Link>
        </div>
      </div>

      {/* Rate Settings */}
      <RateSettings />

      {/* Filter + Summary */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <MeterMonthFilter currentMonth={month} currentYear={year} />
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-[#fff1e9] text-[#897362] rounded-full font-medium">
            {rooms.length} ห้องทั้งหมด
          </span>
          {withReadings.length > 0 && (
            <span className="px-3 py-1 bg-[#ffeadd] text-[#904d00] rounded-full font-medium">
              {withReadings.length} บันทึกแล้ว
            </span>
          )}
          {withoutReadings.length > 0 && (
            <span className="px-3 py-1 bg-[#ffdad6] text-[#93000a] rounded-full font-medium">
              {withoutReadings.length} ยังไม่บันทึก
            </span>
          )}
        </div>
      </div>

      {/* Table (client — handles row clicks) */}
      <MeterTable
        rooms={rooms}
        readingsByRoom={readingsByRoom}
        prevByRoom={prevByRoom}
        ocrDraftByRoom={ocrDraftByRoom}
        month={month}
        year={year}
      />
    </div>
  )
}