import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BedDouble, Wrench, DoorOpen, Plus, Pencil } from 'lucide-react'
import type { Room, RoomStatus } from '@/lib/types/database'

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ floor?: string }>
}) {
  const { floor } = await searchParams
  const supabase = await createClient()

  // Fetch filtered rooms separately to avoid ternary type inference issues
  const roomsResult = floor
    ? await supabase.from('rooms').select('*').eq('floor', parseInt(floor)).order('room_number')
    : await supabase.from('rooms').select('*').order('room_number')
  const rooms = (roomsResult.data ?? []) as Room[]

  const [{ data: allRoomsRaw }, { data: tenantsRaw }] = await Promise.all([
    supabase.from('rooms').select('floor').order('floor'),
    supabase.from('tenants').select('*, profiles(*)').eq('status', 'active'),
  ])

  // Unique floors for filter tabs
  const floors = [
    ...new Set(
      (allRoomsRaw ?? [])
        .map(r => (r as { floor: number | null }).floor)
        .filter((f): f is number => f != null)
    ),
  ].sort((a, b) => a - b)

  type TenantRow = { id: string; room_id: string; move_in_date: string; profiles: unknown }
  const activeTenants = (tenantsRaw ?? []) as TenantRow[]

  // Map room_id → active tenant
  const tenantByRoom = Object.fromEntries(activeTenants.map(t => [t.room_id, t]))

  const total = rooms.length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#241912]">Room Management</h1>
          <p className="text-sm text-[#897362] mt-1">
            Manage dormitory inventory and status in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/rooms/new"
            className="flex items-center gap-2 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Entry
          </Link>
        </div>
      </div>

      {/* Floor Filter Tabs */}
      {floors.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Link
            href="/admin/rooms"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !floor
                ? 'bg-[#ff8c00] text-white'
                : 'bg-white border border-[#ddc1ae] text-[#564334] hover:border-[#ff8c00] hover:text-[#904d00]'
            }`}
          >
            All Floors
          </Link>
          {floors.map(f => (
            <Link
              key={f}
              href={`/admin/rooms?floor=${f}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                floor === String(f)
                  ? 'bg-[#ff8c00] text-white'
                  : 'bg-white border border-[#ddc1ae] text-[#564334] hover:border-[#ff8c00] hover:text-[#904d00]'
              }`}
            >
              Floor {f}
            </Link>
          ))}
        </div>
      )}

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms.map(room => {
          const tenant = tenantByRoom[room.id]
          const profile = tenant
            ? (Array.isArray(tenant.profiles) ? tenant.profiles[0] : tenant.profiles)
            : null
          return (
            <RoomCard
              key={room.id}
              room={room}
              tenant={tenant ? { ...tenant, profile } : null}
            />
          )
        })}

        {/* Add New Room Card */}
        <Link
          href="/admin/rooms/new"
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#ddc1ae] p-8 text-center hover:border-[#ff8c00] hover:bg-[#fff8f5] transition-colors min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-full bg-[#fff1e9] flex items-center justify-center">
            <Plus size={24} className="text-[#897362]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#564334]">Add New Room</p>
            <p className="text-xs text-[#897362] mt-0.5">Expand your dormitory capacity</p>
          </div>
        </Link>
      </div>

      {total === 0 && !floor && (
        <p className="text-center text-sm text-[#897362] mt-12">ยังไม่มีห้องพัก — คลิก Add New Room เพื่อเริ่มต้น</p>
      )}
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
}: {
  room: { id: string; room_number: string; floor: number | null; rent_price: number; status: string }
  tenant: TenantWithProfile | null
}) {
  const status = room.status as RoomStatus

  const iconConfig: Record<RoomStatus, { bg: string; icon: React.ReactNode }> = {
    occupied:    { bg: 'bg-[#ffeadd]', icon: <BedDouble size={22} className="text-[#904d00]" /> },
    available:   { bg: 'bg-[#fff1e9]', icon: <DoorOpen size={22} className="text-[#897362]" /> },
    maintenance: { bg: 'bg-[#ffdad6]', icon: <Wrench size={22} className="text-[#93000a]" /> },
  }

  const badgeConfig: Record<RoomStatus, { label: string; className: string }> = {
    occupied:    { label: 'Occupied',    className: 'bg-[#ffeadd] text-[#904d00]' },
    available:   { label: 'Available',   className: 'bg-[#ff8c00] text-white' },
    maintenance: { label: 'Maintenance', className: 'bg-[#ffdad6] text-[#93000a]' },
  }

  const { bg, icon } = iconConfig[status]
  const badge = badgeConfig[status]

  const initials = tenant?.profile?.full_name
    ? tenant.profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const checkInDate = tenant
    ? new Date(tenant.move_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="relative bg-white rounded-2xl border border-[#ddc1ae] p-5 flex flex-col gap-4 shadow-[0_0_15px_rgba(144,77,0,0.06)] hover:shadow-[0_0_24px_rgba(144,77,0,0.12)] hover:-translate-y-0.5 transition-all cursor-pointer">
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
        <p className="text-base font-bold text-[#241912]">Room {room.room_number}</p>
        <p className="text-xs text-[#897362] mt-0.5">
          {room.floor != null ? `Floor ${room.floor}` : 'No floor'}
          {' • '}
          {room.rent_price.toLocaleString('th-TH')} ฿/mo
        </p>
      </div>

      {/* Status-specific content */}
      <div className="relative z-10">
        {status === 'occupied' && tenant && (
          <div className="flex items-center gap-2.5 bg-[#fff8f5] rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-[#ffeadd] flex items-center justify-center text-xs font-bold text-[#904d00] shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#241912] truncate">{tenant.profile?.full_name ?? '—'}</p>
              <p className="text-[10px] text-[#897362]">Checked in {checkInDate}</p>
            </div>
          </div>
        )}

        {status === 'available' && (
          <div className="rounded-xl border border-dashed border-[#ddc1ae] p-3 text-center">
            <p className="text-xs text-[#897362]">No tenant assigned</p>
          </div>
        )}

        {status === 'maintenance' && (
          <div className="bg-[#fff8f5] rounded-xl p-3">
            <p className="text-xs text-[#93000a] font-medium">Under maintenance</p>
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
            Assign Tenant
          </Link>
        )}

        {status === 'maintenance' && (
          <Link
            href="/admin/maintenance"
            className="flex-1 py-2 rounded-lg border border-[#ffdad6] text-xs font-semibold text-[#93000a] hover:bg-[#ffdad6] transition-colors text-center"
          >
            View Request
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