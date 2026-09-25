import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Camera, Building2, CheckCircle2, AlertCircle } from 'lucide-react'
import type { MeterReading, OcrReading } from '@/lib/types/database'
import MeterMonthFilter from './MeterMonthFilter'
import RateSettings from './RateSettings'
import MeterTable from './MeterTable'

type RoomRow = { id: string; room_number: string; floor: number | null }
type PrevRow  = { room_id: string; meter_type: string; current_reading: number; reading_month: number; reading_year: number }

const MONTH_NAMES = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

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
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#18181B] tracking-tight">จดมิเตอร์น้ำ-ไฟ</h1>
          <p className="text-sm text-[#71717A] mt-1.5">
            ข้อมูลมิเตอร์ประจำเดือน{MONTH_NAMES[month - 1]} {year}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/meters/upload"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#eef4ff] border border-black/5 text-[#2563eb] text-sm font-semibold px-4 py-2.5 rounded-lg shadow-[0_1px_2px_rgba(36,25,18,0.04)] transition-all whitespace-nowrap"
          >
            <Camera size={15} />
            ถ่ายรูปมิเตอร์ (OCR)
          </Link>
          <Link
            href={`/admin/meters/new?month=${month}&year=${year}`}
            className="inline-flex items-center justify-center gap-2 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Plus size={15} />
            กรอกเอง
          </Link>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <SummaryPill icon={Building2} tone="info" label="ห้องทั้งหมด" value={rooms.length} />
        <SummaryPill icon={CheckCircle2} tone="success" label="บันทึกแล้ว" value={withReadings.length} />
        <SummaryPill icon={AlertCircle} tone={withoutReadings.length > 0 ? 'danger' : 'success'} label="ยังไม่บันทึก" value={withoutReadings.length} />
      </div>

      {/* Rate Settings */}
      <RateSettings />

      {/* Month filter */}
      <div className="mb-6">
        <MeterMonthFilter currentMonth={month} currentYear={year} />
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

const summaryTones = {
  info:    'bg-[#eef4ff] text-[#2563eb]',
  success: 'bg-[#e3f5ea] text-[#1e7e46]',
  danger:  'bg-[#fee2e2] text-[#dc2626]',
} as const

function SummaryPill({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  tone: keyof typeof summaryTones
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-black/5 shadow-[0_1px_2px_rgba(36,25,18,0.04)]">
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${summaryTones[tone]}`}>
        <Icon size={16} strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-[#18181B] leading-tight">{value}</p>
        <p className="text-[11px] text-[#71717A] truncate">{label}</p>
      </div>
    </div>
  )
}