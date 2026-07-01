import { createClient } from '@/lib/supabase/server'
import type { Bill } from '@/lib/types/database'
import BillMonthFilter from './BillMonthFilter'
import GenerateBillsPanel from './GenerateBillsPanel'
import BillsTable from './BillsTable'

type RoomRow = { id: string; room_number: string; floor: number | null; rent_price: number }
type TenantRow = { id: string; room_id: string; move_in_date: string; profiles: { full_name: string } | null }
type ReadingRow = { room_id: string; meter_type: 'electric' | 'water'; units_used: number }

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const { month: monthStr, year: yearStr } = await searchParams
  const now = new Date()
  const month = parseInt(monthStr ?? String(now.getMonth() + 1))
  const year = parseInt(yearStr ?? String(now.getFullYear()))

  const supabase = await createClient()

  const [{ data: rawRooms }, { data: rawTenants }, { data: rawBills }, { data: rawReadings }] = await Promise.all([
    supabase.from('rooms').select('id, room_number, floor, rent_price').order('room_number'),
    supabase
      .from('tenants')
      .select('id, room_id, move_in_date, profiles(full_name)')
      .eq('status', 'active')
      .order('move_in_date', { ascending: true }),
    supabase
      .from('bills')
      .select('*')
      .eq('billing_month', month)
      .eq('billing_year', year),
    supabase
      .from('meter_readings')
      .select('room_id, meter_type, units_used')
      .eq('reading_month', month)
      .eq('reading_year', year),
  ])

  const rooms: RoomRow[] = (rawRooms as unknown as RoomRow[]) ?? []
  const tenants: TenantRow[] = (rawTenants as unknown as TenantRow[]) ?? []
  const bills: Bill[] = (rawBills as unknown as Bill[]) ?? []
  const readings: ReadingRow[] = (rawReadings as unknown as ReadingRow[]) ?? []

  // Earliest active tenant per room
  const tenantByRoom: Record<string, { full_name: string }> = {}
  for (const t of tenants) {
    if (!tenantByRoom[t.room_id] && t.profiles) {
      tenantByRoom[t.room_id] = { full_name: t.profiles.full_name }
    }
  }

  const billByRoom: Record<string, Bill> = {}
  for (const b of bills) billByRoom[b.room_id] = b

  const readingTypesByRoom: Record<string, Set<'electric' | 'water'>> = {}
  const unitsByRoom: Record<string, { electric?: number; water?: number }> = {}
  for (const r of readings) {
    if (!readingTypesByRoom[r.room_id]) readingTypesByRoom[r.room_id] = new Set()
    readingTypesByRoom[r.room_id].add(r.meter_type)
    if (!unitsByRoom[r.room_id]) unitsByRoom[r.room_id] = {}
    unitsByRoom[r.room_id][r.meter_type] = r.units_used
  }

  const billedCount = rooms.filter(r => billByRoom[r.id]).length
  const readyCount = rooms.filter(r =>
    !billByRoom[r.id] && tenantByRoom[r.id] &&
    readingTypesByRoom[r.id]?.has('electric') && readingTypesByRoom[r.id]?.has('water')
  ).length
  const missingCount = rooms.filter(r =>
    !billByRoom[r.id] && tenantByRoom[r.id] &&
    !(readingTypesByRoom[r.id]?.has('electric') && readingTypesByRoom[r.id]?.has('water'))
  ).length

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#241912]">Bills</h1>
        <p className="text-sm text-[#897362] mt-1">
          Monthly bills for {MONTH_NAMES[month - 1]} {year}.
        </p>
      </div>

      <GenerateBillsPanel month={month} year={year} />

      {/* Filter + Summary */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <BillMonthFilter currentMonth={month} currentYear={year} />
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-[#fff1e9] text-[#897362] rounded-full font-medium">
            {rooms.length} ห้องทั้งหมด
          </span>
          {billedCount > 0 && (
            <span className="px-3 py-1 bg-[#ffeadd] text-[#904d00] rounded-full font-medium">
              {billedCount} ออกบิลแล้ว
            </span>
          )}
          {readyCount > 0 && (
            <span className="px-3 py-1 bg-[#fff3cd] text-[#8a6100] rounded-full font-medium">
              {readyCount} พร้อมออกบิล
            </span>
          )}
          {missingCount > 0 && (
            <span className="px-3 py-1 bg-[#ffdad6] text-[#93000a] rounded-full font-medium">
              {missingCount} ข้อมูลมิเตอร์ไม่ครบ
            </span>
          )}
        </div>
      </div>

      <BillsTable
        rooms={rooms}
        billByRoom={billByRoom}
        tenantByRoom={tenantByRoom}
        readingTypesByRoom={readingTypesByRoom}
        unitsByRoom={unitsByRoom}
      />
    </div>
  )
}