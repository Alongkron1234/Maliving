import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BedDouble, Wrench, DoorOpen, Plus, Pencil, Building2, Zap, Droplet } from 'lucide-react'
import type { Room, RoomStatus } from '@/lib/types/database'

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ floor?: string }>
}) {
  const { floor } = await searchParams
  const supabase = await createClient()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Fetch filtered rooms separately to avoid ternary type inference issues
  const roomsResult = floor
    ? await supabase.from('rooms').select('*').eq('floor', parseInt(floor)).order('room_number')
    : await supabase.from('rooms').select('*').order('room_number')
  const rooms = (roomsResult.data ?? []) as Room[]

  const [{ data: allRoomsRaw }, { data: tenantsRaw }, { data: readingsRaw }] = await Promise.all([
    supabase.from('rooms').select('floor, status'),
    supabase.from('tenants').select('*, profiles(*)').eq('status', 'active'),
    supabase
      .from('meter_readings')
      .select('room_id, meter_type, units_used')
      .eq('reading_month', currentMonth)
      .eq('reading_year', currentYear) as unknown as Promise<{ data: { room_id: string; meter_type: string; units_used: number }[] | null }>,
  ])

  // Unique floors for filter tabs
  const floors = [
    ...new Set(
      (allRoomsRaw ?? [])
        .map(r => (r as { floor: number | null }).floor)
        .filter((f): f is number => f != null)
    ),
  ].sort((a, b) => a - b)

  const allRooms = (allRoomsRaw ?? []) as { status: RoomStatus }[]
  const summary = {
    total: allRooms.length,
    occupied: allRooms.filter(r => r.status === 'occupied').length,
    available: allRooms.filter(r => r.status === 'available').length,
    maintenance: allRooms.filter(r => r.status === 'maintenance').length,
  }

  type TenantRow = { id: string; room_id: string; move_in_date: string; profiles: unknown }
  const activeTenants = (tenantsRaw ?? []) as TenantRow[]
  const tenantByRoom = Object.fromEntries(activeTenants.map(t => [t.room_id, t]))

  const readingsByRoom: Record<string, { electric?: number; water?: number }> = {}
  for (const r of readingsRaw ?? []) {
    if (!readingsByRoom[r.room_id]) readingsByRoom[r.room_id] = {}
    if (r.meter_type === 'electric') readingsByRoom[r.room_id].electric = r.units_used
    else readingsByRoom[r.room_id].water = r.units_used
  }

  // Group visible rooms by floor for section headers
  const roomsByFloor = new Map<number | null, Room[]>()
  for (const room of rooms) {
    const key = room.floor
    if (!roomsByFloor.has(key)) roomsByFloor.set(key, [])
    roomsByFloor.get(key)!.push(room)
  }
  const floorGroups = [...roomsByFloor.entries()].sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0))

  const total = rooms.length

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#241912] tracking-tight">จัดการห้องพัก</h1>
          <p className="text-sm text-[#897362] mt-1.5">ดูสถานะห้องและจัดการผู้เช่าแบบเรียลไทม์</p>
        </div>
        <Link
          href="/admin/rooms/new"
          className="inline-flex items-center justify-center gap-2 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-[#ff8c00]/30 transition-all hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap"
        >
          <Plus size={16} />
          เพิ่มห้องพัก
        </Link>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryPill icon={Building2} tone="info" label="ห้องทั้งหมด" value={summary.total} />
        <SummaryPill icon={BedDouble} tone="brand" label="มีผู้เช่า" value={summary.occupied} />
        <SummaryPill icon={DoorOpen} tone="success" label="ว่าง" value={summary.available} />
        <SummaryPill icon={Wrench} tone="danger" label="ซ่อมบำรุง" value={summary.maintenance} />
      </div>

      {/* Floor Filter Tabs */}
      {floors.length > 0 && (
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <Link
            href="/admin/rooms"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !floor
                ? 'bg-[#ff8c00] text-white shadow-sm shadow-[#ff8c00]/30'
                : 'bg-white border border-[#ddc1ae] text-[#564334] hover:border-[#ff8c00] hover:text-[#904d00]'
            }`}
          >
            ทุกชั้น
          </Link>
          {floors.map(f => (
            <Link
              key={f}
              href={`/admin/rooms?floor=${f}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                floor === String(f)
                  ? 'bg-[#ff8c00] text-white shadow-sm shadow-[#ff8c00]/30'
                  : 'bg-white border border-[#ddc1ae] text-[#564334] hover:border-[#ff8c00] hover:text-[#904d00]'
              }`}
            >
              ชั้น {f}
            </Link>
          ))}
        </div>
      )}

      {/* Rooms grouped by floor */}
      {floorGroups.map(([floorNum, floorRooms]) => {
        const occupiedOnFloor = floorRooms.filter(r => r.status === 'occupied').length
        return (
          <div key={floorNum ?? 'none'} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#241912]">
                {floorNum != null ? `ชั้น ${floorNum}` : 'ไม่ระบุชั้น'}
                <span className="text-[#897362] font-medium ml-1.5">· {floorRooms.length} ห้อง</span>
              </h2>
              <span className="text-xs font-medium text-[#897362]">มีผู้เช่า {occupiedOnFloor}/{floorRooms.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {floorRooms.map(room => {
                const tenant = tenantByRoom[room.id]
                const profile = tenant
                  ? (Array.isArray(tenant.profiles) ? tenant.profiles[0] : tenant.profiles)
                  : null
                return (
                  <RoomCard
                    key={room.id}
                    room={room}
                    tenant={tenant ? { ...tenant, profile } : null}
                    readings={readingsByRoom[room.id]}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Add New Room Card */}
      <Link
        href="/admin/rooms/new"
        className="flex flex-col sm:flex-row items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#ddc1ae] p-6 text-center hover:border-[#ff8c00] hover:bg-white transition-colors"
      >
        <div className="w-11 h-11 rounded-full bg-[#fff1e9] flex items-center justify-center shrink-0">
          <Plus size={22} className="text-[#897362]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#564334]">เพิ่มห้องใหม่</p>
          <p className="text-xs text-[#897362] mt-0.5">ขยายจำนวนห้องพักในระบบ</p>
        </div>
      </Link>

      {total === 0 && !floor && (
        <p className="text-center text-sm text-[#897362] mt-12">ยังไม่มีห้องพัก — คลิก &quot;เพิ่มห้องพัก&quot; เพื่อเริ่มต้น</p>
      )}
    </div>
  )
}

const summaryTones = {
  brand:   'bg-[#fff1e9] text-[#904d00]',
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
        <p className="text-lg font-bold text-[#241912] leading-tight">{value}</p>
        <p className="text-[11px] text-[#897362] truncate">{label}</p>
      </div>
    </div>
  )
}

type TenantWithProfile = {
  id: string
  move_in_date: string
  profile: { full_name: string; phone?: string | null } | null
}

function RoomCard({
  room,
  tenant,
  readings,
}: {
  room: { id: string; room_number: string; floor: number | null; rent_price: number; status: string }
  tenant: TenantWithProfile | null
  readings?: { electric?: number; water?: number }
}) {
  const status = room.status as RoomStatus

  const iconConfig: Record<RoomStatus, { bg: string; icon: React.ReactNode }> = {
    occupied:    { bg: 'bg-[#fff1e9]', icon: <BedDouble size={20} className="text-[#904d00]" /> },
    available:   { bg: 'bg-[#e3f5ea]', icon: <DoorOpen size={20} className="text-[#1e7e46]" /> },
    maintenance: { bg: 'bg-[#fee2e2]', icon: <Wrench size={20} className="text-[#dc2626]" /> },
  }

  const badgeConfig: Record<RoomStatus, { label: string; className: string }> = {
    occupied:    { label: 'มีผู้เช่า', className: 'bg-[#fff1e9] text-[#904d00]' },
    available:   { label: 'ว่าง',      className: 'bg-[#e3f5ea] text-[#1e7e46]' },
    maintenance: { label: 'ซ่อมบำรุง', className: 'bg-[#fee2e2] text-[#dc2626]' },
  }

  const { bg, icon } = iconConfig[status]
  const badge = badgeConfig[status]

  const initials = tenant?.profile?.full_name
    ? tenant.profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const checkInDate = tenant
    ? new Date(tenant.move_in_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const hasElectric = readings?.electric != null
  const hasWater = readings?.water != null
  const meterReady = hasElectric && hasWater

  return (
    <div className="group relative bg-white rounded-2xl border border-black/5 p-5 flex flex-col gap-4 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] hover:shadow-[0_2px_4px_rgba(36,25,18,0.06),0_12px_32px_rgba(36,25,18,0.08)] hover:-translate-y-0.5 transition-all cursor-pointer">
      {/* Stretched link — makes whole card clickable */}
      <Link href={`/admin/rooms/${room.id}`} className="absolute inset-0 rounded-2xl z-0" />

      {/* Top row: icon + badge */}
      <div className="relative z-10 flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          {icon}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Room info */}
      <div className="relative z-10">
        <p className="text-base font-bold text-[#241912]">ห้อง {room.room_number}</p>
        <p className="text-xs text-[#897362] mt-0.5">
          {room.floor != null ? `ชั้น ${room.floor}` : 'ไม่ระบุชั้น'}
          {' • '}
          {room.rent_price.toLocaleString('th-TH')} ฿/เดือน
        </p>
      </div>

      {/* Status-specific content */}
      <div className="relative z-10 flex flex-col gap-2.5">
        {status === 'occupied' && tenant && (
          <div className="flex items-center gap-2.5 bg-[#fff8f5] rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-[#ffeadd] flex items-center justify-center text-xs font-bold text-[#904d00] shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#241912] truncate">{tenant.profile?.full_name ?? '—'}</p>
              <p className="text-[10px] text-[#897362]">เข้าพักเมื่อ {checkInDate}</p>
            </div>
          </div>
        )}

        {status === 'available' && (
          <div className="rounded-xl border border-dashed border-[#ddc1ae] p-3 text-center">
            <p className="text-xs text-[#897362]">ยังไม่มีผู้เช่า</p>
          </div>
        )}

        {status === 'maintenance' && (
          <div className="bg-[#fff8f5] rounded-xl p-3">
            <p className="text-xs text-[#dc2626] font-medium">อยู่ระหว่างซ่อมบำรุง</p>
          </div>
        )}

        {/* This month's meter status — only meaningful for occupied rooms */}
        {status === 'occupied' && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${hasElectric ? 'bg-[#fff1e9] text-[#904d00]' : 'bg-[#f5f0ea] text-[#c9a990]'}`}>
              <Zap size={11} /> {hasElectric ? `${readings!.electric} หน่วย` : '—'}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${hasWater ? 'bg-[#eef4ff] text-[#2563eb]' : 'bg-[#f5f0ea] text-[#c9a990]'}`}>
              <Droplet size={11} /> {hasWater ? `${readings!.water} หน่วย` : '—'}
            </span>
            {!meterReady && (
              <span className="ml-auto px-2 py-1 rounded-lg bg-[#fee2e2] text-[#dc2626] font-semibold">รอมิเตอร์</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="relative z-10 flex items-center gap-2 mt-auto">
        {status === 'available' && (
          <Link
            href={`/admin/tenants/new?room=${room.id}`}
            className="flex-1 py-2 rounded-lg bg-[#ff8c00] hover:bg-[#904d00] text-white text-xs font-semibold transition-colors text-center"
          >
            มอบหมายผู้เช่า
          </Link>
        )}

        {status === 'maintenance' && (
          <Link
            href="/admin/maintenance"
            className="flex-1 py-2 rounded-lg border border-[#fecaca] text-xs font-semibold text-[#dc2626] hover:bg-[#fee2e2] transition-colors text-center"
          >
            ดูรายการแจ้งซ่อม
          </Link>
        )}

        <Link
          href={`/admin/rooms/${room.id}/edit`}
          className="w-8 h-8 rounded-lg border border-[#ddc1ae] flex items-center justify-center hover:border-[#904d00] hover:text-[#904d00] text-[#897362] transition-colors shrink-0 ml-auto"
        >
          <Pencil size={13} />
        </Link>
      </div>
    </div>
  )
}
