import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, User } from 'lucide-react'

type TenantRow = {
  id: string
  move_in_date: string
  profiles: { full_name: string; phone: string | null } | null
  rooms: { room_number: string; floor: number | null } | null
}

export default async function TenantsPage() {
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('tenants')
    .select('*, profiles(*), rooms(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenants: TenantRow[] = (raw as any) ?? []

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-[#241912]">Tenant Management</h1>
          <p className="text-sm text-[#897362] mt-1">
            {tenants.length} active {tenants.length === 1 ? 'tenant' : 'tenants'} across all rooms.
          </p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="flex items-center gap-2 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Tenant
        </Link>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#ddc1ae] p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#fff1e9] flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-[#897362]" />
          </div>
          <p className="text-sm font-semibold text-[#564334]">No tenants yet</p>
          <p className="text-sm text-[#897362] mt-1">Add a tenant to get started.</p>
          <Link
            href="/admin/tenants/new"
            className="inline-block mt-4 text-sm font-semibold text-[#ff8c00] hover:text-[#904d00] transition-colors"
          >
            Add your first tenant →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tenants.map(t => {
            const profile = t.profiles
            const room = t.rooms
            const initials = profile?.full_name
              ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              : '?'
            const moveIn = new Date(t.move_in_date).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })

            return (
              <div
                key={t.id}
                className="relative bg-white rounded-2xl border border-[#ddc1ae] p-5 flex flex-col gap-4 shadow-[0_0_15px_rgba(144,77,0,0.06)] hover:shadow-[0_0_24px_rgba(144,77,0,0.12)] hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                {/* Stretched link */}
                <Link href={`/admin/tenants/${t.id}`} className="absolute inset-0 rounded-2xl z-0" />

                {/* Avatar + room badge */}
                <div className="relative z-10 flex items-start justify-between">
                  <div className="w-10 h-10 rounded-full bg-[#ffeadd] flex items-center justify-center text-sm font-bold text-[#904d00] shrink-0">
                    {initials}
                  </div>
                  {room && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fff1e9] text-[#904d00]">
                      Room {room.room_number}
                    </span>
                  )}
                </div>

                {/* Name + phone */}
                <div className="relative z-10">
                  <p className="text-base font-bold text-[#241912]">{profile?.full_name ?? '—'}</p>
                  <p className="text-xs text-[#897362] mt-0.5">{profile?.phone ?? 'No phone'}</p>
                </div>

                {/* Move-in */}
                <div className="relative z-10 flex items-center gap-1.5">
                  <div className="flex-1 bg-[#fff8f5] rounded-xl p-3">
                    <p className="text-[10px] text-[#897362] uppercase tracking-wide font-semibold mb-0.5">Move-in</p>
                    <p className="text-xs font-semibold text-[#564334]">{moveIn}</p>
                  </div>
                  {room?.floor != null && (
                    <div className="bg-[#fff8f5] rounded-xl p-3">
                      <p className="text-[10px] text-[#897362] uppercase tracking-wide font-semibold mb-0.5">Floor</p>
                      <p className="text-xs font-semibold text-[#564334]">{room.floor}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add card */}
          <Link
            href="/admin/tenants/new"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#ddc1ae] p-8 text-center hover:border-[#ff8c00] hover:bg-[#fff8f5] transition-colors min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full bg-[#fff1e9] flex items-center justify-center">
              <Plus size={24} className="text-[#897362]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#564334]">Add Tenant</p>
              <p className="text-xs text-[#897362] mt-0.5">Register a new occupant</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}