import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import type { Room, RoomStatus } from '@/lib/types/database'
import DeleteRoomButton from './DeleteRoomButton'

type TenantRow = {
  id: string
  move_in_date: string
  profiles: { full_name: string; phone: string | null } | { full_name: string; phone: string | null }[] | null
}

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: roomRaw } = await supabase.from('rooms').select('*').eq('id', id).single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const room: Room | null = roomRaw as any

  const { data: tenantsRaw } = await supabase
    .from('tenants')
    .select('*, profiles(*)')
    .eq('room_id', id)
    .eq('status', 'active')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenants: TenantRow[] = (tenantsRaw as any) ?? []

  if (!room) notFound()

  const status = room.status as RoomStatus

  const statusConfig: Record<RoomStatus, { label: string; badge: string }> = {
    available:   { label: 'Available',   badge: 'bg-[#ff8c00] text-white' },
    occupied:    { label: 'Occupied',    badge: 'bg-[#ffeadd] text-[#904d00]' },
    maintenance: { label: 'Maintenance', badge: 'bg-[#ffdad6] text-[#93000a]' },
  }

  const { label, badge } = statusConfig[status]

  return (
    <div className="p-8">
      <Link
        href="/admin/rooms"
        className="inline-flex items-center gap-1.5 text-sm text-[#897362] hover:text-[#564334] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Back to Rooms
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-7">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#241912]">Room {room.room_number}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge}`}>{label}</span>
          </div>
          <p className="text-sm text-[#897362] mt-1">
            {room.floor != null ? `Floor ${room.floor}` : 'No floor assigned'}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <DeleteRoomButton roomId={room.id} hasActiveTenants={tenants.length > 0} />
          <Link
            href={`/admin/rooms/${room.id}/edit`}
            className="inline-flex items-center gap-2 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Pencil size={15} />
            Edit Room
          </Link>
        </div>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Room Specifications */}
        <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
          <h2 className="text-base font-bold text-[#241912] mb-1">Room Specifications</h2>
          <p className="text-sm text-[#897362] mb-6">Current details for this room unit.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <InfoField label="Room Number" value={room.room_number} />
            <InfoField label="Floor" value={room.floor != null ? `Floor ${room.floor}` : '—'} />
            <InfoField label="Monthly Rent" value={`฿${room.rent_price.toLocaleString('th-TH')}`} />
            <div>
              <p className="text-xs font-semibold text-[#897362] uppercase tracking-wide mb-1.5">Status</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badge}`}>{label}</span>
            </div>
          </div>
        </div>

        {/* Current Tenants */}
        <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-[#241912]">Current Tenants</h2>
            <Link
              href={`/admin/tenants/new?room=${room.id}`}
              className="text-xs font-semibold text-[#ff8c00] hover:text-[#904d00] transition-colors"
            >
              + Add Tenant
            </Link>
          </div>
          <p className="text-sm text-[#897362] mb-6">Active occupants assigned to this room.</p>

          {tenants && tenants.length > 0 ? (
            <div className="space-y-3">
              {tenants.map(t => {
                const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
                const initials = profile?.full_name
                  ? (profile.full_name as string).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  : '?'
                return (
                  <div key={t.id} className="flex items-center gap-3 p-4 bg-[#fff8f5] rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-[#ffeadd] flex items-center justify-center text-sm font-bold text-[#904d00] shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#241912]">{profile?.full_name ?? '—'}</p>
                      <p className="text-xs text-[#897362]">{profile?.phone ?? 'No phone'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[#897362]">Move-in</p>
                      <p className="text-xs font-semibold text-[#564334]">
                        {new Date(t.move_in_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#ddc1ae] p-8 text-center">
              <p className="text-sm text-[#897362]">No tenants assigned to this room</p>
              <Link
                href={`/admin/tenants/new?room=${room.id}`}
                className="inline-block mt-3 text-xs font-semibold text-[#ff8c00] hover:text-[#904d00] transition-colors"
              >
                Assign a tenant →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#897362] uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-sm font-semibold text-[#241912]">{value}</p>
    </div>
  )
}