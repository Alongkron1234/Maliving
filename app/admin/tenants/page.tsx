import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, User, Phone, Calendar, Users, MessageCircle, type LucideIcon } from 'lucide-react'
import TenantsToolbar from './TenantsToolbar'

type TenantRow = {
  id: string
  move_in_date: string
  profiles: { full_name: string; phone: string | null; line_connected_at: string | null } | null
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

  const lineConnected = tenants.filter(t => t.profiles?.line_connected_at).length

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#241912] tracking-tight">ข้อมูลผู้เช่า</h1>
          <p className="text-sm text-[#897362] mt-1.5">
            ผู้เช่าที่ยัง active อยู่ {tenants.length} คน จากทุกห้อง
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <TenantsToolbar tenants={tenants} />
          <Link
            href="/admin/tenants/new"
            className="inline-flex items-center justify-center gap-2 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-[#ff8c00]/30 transition-all hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Plus size={16} />
            เพิ่มผู้เช่า
          </Link>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <SummaryPill icon={Users} tone="info" label="ผู้เช่าทั้งหมด" value={tenants.length} />
        <SummaryPill
          icon={MessageCircle}
          tone={lineConnected === tenants.length && tenants.length > 0 ? 'success' : 'brand'}
          label="เชื่อมต่อ Line Bot แล้ว"
          value={tenants.length > 0 ? `${lineConnected}/${tenants.length}` : '0/0'}
        />
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#ddc1ae] p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#fff1e9] flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-[#897362]" />
          </div>
          <p className="text-sm font-semibold text-[#564334]">ยังไม่มีผู้เช่า</p>
          <p className="text-sm text-[#897362] mt-1">เพิ่มผู้เช่าคนแรกเพื่อเริ่มต้นใช้งาน</p>
          <Link
            href="/admin/tenants/new"
            className="inline-block mt-4 text-sm font-semibold text-[#ff8c00] hover:text-[#904d00] transition-colors"
          >
            เพิ่มผู้เช่าคนแรก →
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
            const moveIn = new Date(t.move_in_date).toLocaleDateString('th-TH', {
              day: 'numeric', month: 'short', year: 'numeric',
            })
            const lineConnectedAt = profile?.line_connected_at

            return (
              <div
                key={t.id}
                className="group relative bg-white rounded-2xl border border-black/5 p-5 flex flex-col gap-4 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] hover:shadow-[0_2px_4px_rgba(36,25,18,0.06),0_12px_32px_rgba(36,25,18,0.08)] hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                {/* Stretched link */}
                <Link href={`/admin/tenants/${t.id}`} className="absolute inset-0 rounded-2xl z-0" />

                {/* Avatar + room badge */}
                <div className="relative z-10 flex items-start justify-between">
                  <div className="w-10 h-10 rounded-full bg-[#ffeadd] flex items-center justify-center text-sm font-bold text-[#904d00] shrink-0">
                    {initials}
                  </div>
                  {room && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#eef4ff] text-[#2563eb]">
                      ห้อง {room.room_number}
                    </span>
                  )}
                </div>

                {/* Name + phone */}
                <div className="relative z-10">
                  <p className="text-base font-bold text-[#241912] truncate">{profile?.full_name ?? '—'}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Phone size={11} className={profile?.phone ? 'text-[#897362]' : 'text-[#dc2626]'} />
                    <p className={`text-xs ${profile?.phone ? 'text-[#897362]' : 'text-[#dc2626] font-medium'}`}>
                      {profile?.phone ?? 'ไม่มีเบอร์โทร'}
                    </p>
                  </div>
                </div>

                {/* Move-in */}
                <div className="relative z-10 flex items-center gap-2 bg-[#fff8f5] rounded-xl p-3">
                  <Calendar size={14} className="text-[#897362] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#897362] uppercase tracking-wide font-semibold">เข้าพักเมื่อ</p>
                    <p className="text-xs font-semibold text-[#564334]">{moveIn}</p>
                  </div>
                </div>

                {/* Line bot status — real, set by the webhook on a successful phone match */}
                <div className="relative z-10">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium ${
                    lineConnectedAt ? 'bg-[#e3f5ea] text-[#1e7e46]' : 'bg-[#f5f0ea] text-[#897362]'
                  }`}>
                    <MessageCircle size={11} /> {lineConnectedAt ? 'เชื่อม Line แล้ว' : 'ยังไม่เชื่อม Line'}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Add card */}
          <Link
            href="/admin/tenants/new"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#ddc1ae] p-8 text-center hover:border-[#ff8c00] hover:bg-white transition-colors min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full bg-[#fff1e9] flex items-center justify-center">
              <Plus size={24} className="text-[#897362]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#564334]">เพิ่มผู้เช่า</p>
              <p className="text-xs text-[#897362] mt-0.5">ลงทะเบียนผู้เช่าใหม่</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}

const summaryTones = {
  info:    'bg-[#eef4ff] text-[#2563eb]',
  success: 'bg-[#e3f5ea] text-[#1e7e46]',
  brand:   'bg-[#fff1e9] text-[#904d00]',
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
  value: number | string
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
