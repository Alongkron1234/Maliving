import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BedDouble, Wrench, DoorOpen, Plus, Pencil, Building2, Zap, Droplet, Wallet } from 'lucide-react'
import type { Room, RoomStatus } from '@/lib/types/database'
import RoomsSearch from './RoomsSearch'

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ floor?: string; status?: string; q?: string }>
}) {
  const { floor, status: statusFilter, q } = await searchParams
  const supabase = await createClient()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Fetch filtered rooms separately to avoid ternary type inference issues
  let roomsQuery = supabase.from('rooms').select('*').order('room_number')
  if (floor) roomsQuery = roomsQuery.eq('floor', parseInt(floor))
  if (statusFilter) roomsQuery = roomsQuery.eq('status', statusFilter)
  const roomsResult = await roomsQuery
  let rooms = (roomsResult.data ?? []) as Room[]

  const [{ data: allRoomsRaw }, { data: tenantsRaw }, { data: readingsRaw }] = await Promise.all([
    supabase.from('rooms').select('floor, status, rent_price'),
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

  const allRooms = (allRoomsRaw ?? []) as { status: RoomStatus; rent_price: number }[]
  const summary = {
    total: allRooms.length,
    occupied: allRooms.filter(r => r.status === 'occupied').length,
    available: allRooms.filter(r => r.status === 'available').length,
    maintenance: allRooms.filter(r => r.status === 'maintenance').length,
  }
  const monthlyRentRevenue = allRooms
    .filter(r => r.status === 'occupied')
    .reduce((sum, r) => sum + r.rent_price, 0)

  type TenantRow = { id: string; room_id: string; move_in_date: string; profiles: unknown }
  const activeTenants = (tenantsRaw ?? []) as TenantRow[]
  const tenantByRoom = Object.fromEntries(activeTenants.map(t => [t.room_id, t]))

  // Client search box filters by room number OR the active tenant's name
  if (q) {
    const needle = q.trim().toLowerCase()
    rooms = rooms.filter(room => {
      if (room.room_number.toLowerCase().includes(needle)) return true
      const tenant = tenantByRoom[room.id] as { profiles?: unknown } | undefined
      const profile = tenant?.profiles
      const name = Array.isArray(profile) ? profile[0]?.full_name : (profile as { full_name?: string } | null)?.full_name
      return name?.toLowerCase().includes(needle) ?? false
    })
  }

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
          <h1 className="text-3xl font-bold text-[#18181B] tracking-tight">จัดการห้องพัก</h1>
          <p className="text-sm text-[#71717A] mt-1.5">ดูสถานะห้องและจัดการผู้เช่าแบบเรียลไทม์</p>
        </div>
        <Link
          href="/admin/rooms/new"
          className="inline-flex items-center justify-center gap-2 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap"
        >
          <Plus size={16} />
          เพิ่มห้องพัก
        </Link>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryPill icon={Building2} tone="info" label="ห้องทั้งหมด" value={summary.total} />
        <SummaryPill icon={DoorOpen} tone="success" label="ว่าง" value={summary.available} />
        <SummaryPill icon={Wrench} tone="danger" label="ซ่อมบำรุง" value={summary.maintenance} />
        <SummaryPill icon={Wallet} tone="brand" label="รายได้ค่าเช่ารวม/เดือน" value={`฿${monthlyRentRevenue.toLocaleString('th-TH')}`} />
      </div>

      {/* Filters: floor tabs, status tabs, search */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-8">
        <div className="flex items-center gap-2 flex-wrap">
          {floors.length > 0 && (
            <>
              <FilterLink href="/admin/rooms" active={!floor}>ทุกชั้น</FilterLink>
              {floors.map(f => (
                <FilterLink key={f} href={`/admin/rooms?floor=${f}`} active={floor === String(f)}>
                  ชั้น {f}
                </FilterLink>
              ))}
              <span className="w-px h-5 bg-[#E4E4E7] mx-1" />
            </>
          )}
          <FilterLink href={floor ? `/admin/rooms?floor=${floor}` : '/admin/rooms'} active={!statusFilter}>
            ทั้งหมด
          </FilterLink>
          <FilterLink href={`/admin/rooms?status=occupied${floor ? `&floor=${floor}` : ''}`} active={statusFilter === 'occupied'}>
            มีผู้เช่า ({summary.occupied})
          </FilterLink>
          <FilterLink href={`/admin/rooms?status=available${floor ? `&floor=${floor}` : ''}`} active={statusFilter === 'available'}>
            ห้องว่าง ({summary.available})
          </FilterLink>
          <FilterLink href={`/admin/rooms?status=maintenance${floor ? `&floor=${floor}` : ''}`} active={statusFilter === 'maintenance'}>
            แจ้งซ่อม ({summary.maintenance})
          </FilterLink>
        </div>
        <RoomsSearch initialQuery={q} />
      </div>

      {/* Rooms grouped by floor */}
      {floorGroups.map(([floorNum, floorRooms]) => {
        const occupiedOnFloor = floorRooms.filter(r => r.status === 'occupied').length
        return (
          <div key={floorNum ?? 'none'} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#18181B]">
                {floorNum != null ? `ชั้น ${floorNum}` : 'ไม่ระบุชั้น'}
                <span className="text-[#71717A] font-medium ml-1.5">· {floorRooms.length} ห้อง</span>
              </h2>
              <span className="text-xs font-medium text-[#71717A]">มีผู้เช่า {occupiedOnFloor}/{floorRooms.length}</span>
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

      {total === 0 ? (
        <p className="text-center text-sm text-[#71717A] py-12">
          {floor || statusFilter || q
            ? 'ไม่พบห้องที่ตรงกับเงื่อนไขที่เลือก'
            : 'ยังไม่มีห้องพัก — คลิก "เพิ่มห้องใหม่" เพื่อเริ่มต้น'}
        </p>
      ) : (
        <Link
          href="/admin/rooms/new"
          className="flex flex-col sm:flex-row items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#E4E4E7] p-6 text-center hover:border-[#FF6A00] hover:bg-white transition-colors"
        >
          <div className="w-11 h-11 rounded-full bg-[#FFE8D1] flex items-center justify-center shrink-0">
            <Plus size={22} className="text-[#71717A]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#3F3F46]">เพิ่มห้องใหม่</p>
            <p className="text-xs text-[#71717A] mt-0.5">ขยายจำนวนห้องพักในระบบ</p>
          </div>
        </Link>
      )}
    </div>
  )
}

const summaryTones = {
  brand:   'bg-[#FFE8D1] text-[#C2410C]',
  info:    'bg-[#eef4ff] text-[#2563eb]',
  success: 'bg-[#e3f5ea] text-[#1e7e46]',
  danger:  'bg-[#fee2e2] text-[#dc2626]',
} as const

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-[#FF6A00] text-white shadow-sm shadow-[#FF6A00]/30'
          : 'bg-white border border-[#E4E4E7] text-[#3F3F46] hover:border-[#FF6A00] hover:text-[#C2410C]'
      }`}
    >
      {children}
    </Link>
  )
}

function SummaryPill({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  tone: keyof typeof summaryTones
  label: string
  value: number | string
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-black/5 shadow-[0_1px_2px_rgba(36,25,18,0.04)]">
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${summaryTones[tone]}`}>
        <Icon size={16} strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-[#18181B] leading-tight truncate">{value}</p>
        <p className="text-[11px] text-[#71717A] truncate">{label}</p>
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
    occupied:    { bg: 'bg-[#FFE8D1]', icon: <BedDouble size={20} className="text-[#C2410C]" /> },
    available:   { bg: 'bg-[#e3f5ea]', icon: <DoorOpen size={20} className="text-[#1e7e46]" /> },
    maintenance: { bg: 'bg-[#fee2e2]', icon: <Wrench size={20} className="text-[#dc2626]" /> },
  }

  const badgeConfig: Record<RoomStatus, { label: string; className: string }> = {
    occupied:    { label: 'มีผู้เช่า', className: 'bg-[#FFE8D1] text-[#C2410C]' },
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
        <p className="text-base font-bold text-[#18181B]">ห้อง {room.room_number}</p>
        <p className="text-xs text-[#71717A] mt-0.5">
          {room.floor != null ? `ชั้น ${room.floor}` : 'ไม่ระบุชั้น'}
          {' • '}
          {room.rent_price.toLocaleString('th-TH')} ฿/เดือน
        </p>
      </div>

      {/* Status-specific content */}
      <div className="relative z-10 flex flex-col gap-2.5">
        {status === 'occupied' && tenant && (
          <div className="flex items-center gap-2.5 bg-[#FFFAF7] rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-[#FFD9B3] flex items-center justify-center text-xs font-bold text-[#C2410C] shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#18181B] truncate">{tenant.profile?.full_name ?? '—'}</p>
              <p className="text-[10px] text-[#71717A]">เข้าพักเมื่อ {checkInDate}</p>
            </div>
          </div>
        )}

        {status === 'available' && (
          <div className="rounded-xl border border-dashed border-[#E4E4E7] p-3 text-center">
            <p className="text-xs text-[#71717A]">ยังไม่มีผู้เช่า</p>
          </div>
        )}

        {status === 'maintenance' && (
          <div className="bg-[#FFFAF7] rounded-xl p-3">
            <p className="text-xs text-[#dc2626] font-medium">อยู่ระหว่างซ่อมบำรุง</p>
          </div>
        )}

        {/* This month's meter status — only meaningful for occupied rooms */}
        {status === 'occupied' && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${hasElectric ? 'bg-[#FFE8D1] text-[#C2410C]' : 'bg-[#F4F4F5] text-[#A1A1AA]'}`}>
              <Zap size={11} /> {hasElectric ? `${readings!.electric} หน่วย` : '—'}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${hasWater ? 'bg-[#eef4ff] text-[#2563eb]' : 'bg-[#F4F4F5] text-[#A1A1AA]'}`}>
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
            className="flex-1 py-2 rounded-lg bg-[#FF6A00] hover:bg-[#C2410C] text-white text-xs font-semibold transition-colors text-center"
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
          className="w-8 h-8 rounded-lg border border-[#E4E4E7] flex items-center justify-center hover:border-[#C2410C] hover:text-[#C2410C] text-[#71717A] transition-colors shrink-0 ml-auto"
        >
          <Pencil size={13} />
        </Link>
      </div>
    </div>
  )
}
