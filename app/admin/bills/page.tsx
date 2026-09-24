import { createClient } from '@/lib/supabase/server'
import { Building2, CheckCircle2, Clock, AlertCircle, type LucideIcon } from 'lucide-react'
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

  const MONTH_NAMES = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#18181B] tracking-tight">บิล</h1>
        <p className="text-sm text-[#71717A] mt-1.5">
          บิลประจำเดือน{MONTH_NAMES[month - 1]} {year}
        </p>
      </div>

      <GenerateBillsPanel month={month} year={year} />

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryPill icon={Building2} tone="info" label="ห้องทั้งหมด" value={rooms.length} />
        <SummaryPill icon={CheckCircle2} tone="brand" label="ออกบิลแล้ว" value={billedCount} />
        <SummaryPill icon={Clock} tone="warning" label="พร้อมออกบิล" value={readyCount} />
        <SummaryPill icon={AlertCircle} tone={missingCount > 0 ? 'danger' : 'success'} label="ข้อมูลมิเตอร์ไม่ครบ" value={missingCount} />
      </div>

      <div className="mb-6">
        <BillMonthFilter currentMonth={month} currentYear={year} />
      </div>

      <BillsTable
        rooms={rooms}
        billByRoom={billByRoom}
        tenantByRoom={tenantByRoom}
        readingTypesByRoom={readingTypesByRoom}
        unitsByRoom={unitsByRoom}
        month={month}
        year={year}
      />
    </div>
  )
}

const summaryTones = {
  brand:   'bg-[#FFE8D1] text-[#C2410C]',
  info:    'bg-[#EEF4FF] text-[#2563EB]',
  success: 'bg-[#e3f5ea] text-[#1e7e46]',
  warning: 'bg-[#FEF3C7] text-[#B45309]',
  danger:  'bg-[#FEE2E2] text-[#B91C1C]',
} as const

function SummaryPill({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIcon
  tone: keyof typeof summaryTones
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-black/5 shadow-[0_1px_2px_rgba(36,25,18,0.04)] hover:shadow-[0_4px_16px_rgba(36,25,18,0.08)] transition-shadow">
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