import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Home, Pencil } from 'lucide-react'
import type { Bill, TenantStatus } from '@/lib/types/database'
import { billStatusConfig, getEffectiveBillStatus } from '@/lib/bills'
import RemoveTenantButton from './RemoveTenantButton'

type TenantDetail = {
  id: string
  move_in_date: string
  move_out_date: string | null
  status: TenantStatus
  profiles: { id: string; full_name: string; phone: string | null } | null
  rooms: { id: string; room_number: string; floor: number | null } | null
}

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawTenant } = await supabase
    .from('tenants')
    .select('*, profiles(*), rooms(*)')
    .eq('id', id)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant: TenantDetail | null = rawTenant as any

  if (!tenant) notFound()

  // Email lives on auth.users, not profiles — fetch via the admin API (server-only)
  let email: string | null = null
  if (tenant.profiles) {
    const { data: authUser } = await createAdminClient().auth.admin.getUserById(tenant.profiles.id)
    email = authUser.user?.email ?? null
  }

  const { data: rawBills } = await supabase
    .from('bills')
    .select('*')
    .eq('tenant_id', id)
    .order('billing_year', { ascending: false })
    .order('billing_month', { ascending: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bills: Bill[] = (rawBills as any) ?? []

  const profile = tenant.profiles
  const room = tenant.rooms
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const moveIn = new Date(tenant.move_in_date).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const isActive = tenant.status === 'active'

  return (
    <div className="p-8">
      <Link
        href="/admin/tenants"
        className="inline-flex items-center gap-1.5 text-sm text-[#897362] hover:text-[#564334] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Back to Tenants
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-7">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#ffeadd] flex items-center justify-center text-lg font-bold text-[#904d00] shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-[#241912]">{profile?.full_name ?? '—'}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-[#ff8c00] text-white' : 'bg-[#fff1e9] text-[#897362]'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-[#897362] mt-0.5">{profile?.phone ?? 'No phone'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {profile && room && isActive && (
            <RemoveTenantButton
              tenantId={tenant.id}
              profileId={profile.id}
              roomId={room.id}
              tenantName={profile.full_name}
            />
          )}
          {room && (
            <Link
              href={`/admin/rooms/${room.id}`}
              className="inline-flex items-center gap-2 border border-[#ddc1ae] text-[#564334] text-sm font-semibold px-4 py-2.5 rounded-lg hover:border-[#904d00] hover:text-[#904d00] transition-colors"
            >
              <Home size={15} />
              Room {room.room_number}
            </Link>
          )}
          <Link
            href={`/admin/tenants/${tenant.id}/edit`}
            className="inline-flex items-center gap-2 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Pencil size={15} />
            Edit
          </Link>
        </div>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Tenant Information */}
        <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
          <h2 className="text-base font-bold text-[#241912] mb-1">Tenant Information</h2>
          <p className="text-sm text-[#897362] mb-6">Current details for this occupant.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <InfoField label="Full Name" value={profile?.full_name ?? '—'} />
            <InfoField label="Email" value={email ?? '—'} />
            <InfoField label="Phone" value={profile?.phone ?? 'No phone'} />
            <InfoField
              label="Room"
              value={room ? `Room ${room.room_number}${room.floor != null ? ` · Floor ${room.floor}` : ''}` : '—'}
            />
            <InfoField label="Move-in Date" value={moveIn} />
          </div>
        </div>

        {/* Bill History */}
        <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
          <h2 className="text-base font-bold text-[#241912] mb-1">Bill History</h2>
          <p className="text-sm text-[#897362] mb-6">
            {bills.length} bill{bills.length !== 1 ? 's' : ''} on record.
          </p>

          {bills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#ddc1ae] p-8 text-center">
              <p className="text-sm text-[#897362]">No bills generated yet for this tenant.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f0e0d4]">
              {bills.map(bill => {
                const { label, className } = billStatusConfig[getEffectiveBillStatus(bill)]
                return (
                  <Link
                    key={bill.id}
                    href={`/admin/bills/${bill.id}`}
                    className="flex items-center justify-between py-3.5 hover:bg-[#fff8f5] -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#241912]">
                        {monthNames[bill.billing_month - 1]} {bill.billing_year}
                      </p>
                      <p className="text-xs text-[#897362] mt-0.5">
                        Rent ฿{bill.rent_amount.toLocaleString('th-TH')} + Electric + Water
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-sm font-bold text-[#241912]">
                        ฿{bill.total_amount.toLocaleString('th-TH')}
                      </p>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
                        {label}
                      </span>
                    </div>
                  </Link>
                )
              })}
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