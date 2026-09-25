import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Home, Pencil, Mail, Phone, Calendar, Receipt } from 'lucide-react'
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

const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

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

  const moveIn = new Date(tenant.move_in_date).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const isActive = tenant.status === 'active'

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <Link
        href="/admin/tenants"
        className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#3F3F46] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        กลับไปหน้าผู้เช่า
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#FFD9B3] flex items-center justify-center text-lg font-bold text-[#C2410C] shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-[#18181B] tracking-tight">{profile?.full_name ?? '—'}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-[#FF6A00] text-white' : 'bg-[#FFE8D1] text-[#71717A]'}`}>
                {isActive ? 'Active (พักอยู่)' : 'Inactive (ย้ายออกแล้ว)'}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Phone size={12} className="text-[#71717A]" />
              <p className="text-sm text-[#71717A]">{profile?.phone ?? 'ไม่มีเบอร์โทร'}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
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
              className="inline-flex items-center gap-2 border border-[#E4E4E7] text-[#3F3F46] text-sm font-semibold px-4 py-2.5 rounded-lg hover:border-[#C2410C] hover:text-[#C2410C] transition-colors"
            >
              <Home size={15} />
              ห้อง {room.room_number}
            </Link>
          )}
          <Link
            href={`/admin/tenants/${tenant.id}/edit`}
            className="inline-flex items-center gap-2 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <Pencil size={15} />
            แก้ไข
          </Link>
        </div>
      </div>

      <div className="space-y-5">
        {/* Tenant Information */}
        <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
          <h2 className="text-base font-bold text-[#18181B] mb-1">ข้อมูลผู้เช่า</h2>
          <p className="text-sm text-[#71717A] mb-6">รายละเอียดปัจจุบันของผู้เช่าคนนี้</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <InfoField icon={Home} label="ชื่อ-นามสกุล" value={profile?.full_name ?? '—'} />
            <InfoField icon={Mail} label="อีเมล" value={email ?? '—'} />
            <InfoField icon={Phone} label="เบอร์โทรศัพท์" value={profile?.phone ?? 'ไม่มีเบอร์โทร'} />
            <InfoField
              icon={Home}
              label="ห้องพัก"
              value={room ? `ห้อง ${room.room_number}${room.floor != null ? ` · ชั้น ${room.floor}` : ''}` : '—'}
            />
            <InfoField icon={Calendar} label="วันที่เข้าพัก" value={moveIn} />
          </div>
        </div>

        {/* Bill History */}
        <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
          <div className="flex items-center gap-2 mb-1">
            <Receipt size={16} className="text-[#71717A]" />
            <h2 className="text-base font-bold text-[#18181B]">ประวัติบิล</h2>
          </div>
          <p className="text-sm text-[#71717A] mb-6">
            มีบิลทั้งหมด {bills.length} รายการในระบบ
          </p>

          {bills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E4E4E7] p-8 text-center">
              <p className="text-sm text-[#71717A]">ยังไม่มีการออกบิลให้ผู้เช่าคนนี้</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F4F4F5]">
              {bills.map(bill => {
                const { label, className } = billStatusConfig[getEffectiveBillStatus(bill)]
                return (
                  <Link
                    key={bill.id}
                    href={`/admin/bills/${bill.id}`}
                    className="flex items-center justify-between py-3.5 hover:bg-[#FFFAF7] -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#18181B]">
                        {monthNames[bill.billing_month - 1]} {bill.billing_year}
                      </p>
                      <p className="text-xs text-[#71717A] mt-0.5">
                        ค่าเช่า ฿{bill.rent_amount.toLocaleString('th-TH')} + ค่าไฟ + ค่าน้ำ
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-sm font-bold text-[#18181B]">
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

function InfoField({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={12} className="text-[#A1A1AA]" />
        <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm font-semibold text-[#18181B]">{value}</p>
    </div>
  )
}
