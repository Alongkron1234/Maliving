import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil, BedDouble, Users, Phone, Calendar, Plus, UserRound } from 'lucide-react'
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

  const statusConfig: Record<RoomStatus, { label: string; badge: string; icon: string }> = {
    available:   { label: 'ว่าง',       badge: 'bg-[#e3f5ea] text-[#1e7e46]', icon: 'bg-[#e3f5ea] text-[#1e7e46]' },
    occupied:    { label: 'มีผู้เช่า',  badge: 'bg-[#FFD9B3] text-[#C2410C]', icon: 'bg-[#FFE8D1] text-[#C2410C]' },
    maintenance: { label: 'ซ่อมบำรุง', badge: 'bg-[#FEE2E2] text-[#B91C1C]', icon: 'bg-[#FEE2E2] text-[#B91C1C]' },
  }

  const { label, badge, icon } = statusConfig[status]

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <Link
        href="/admin/rooms"
        className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#3F3F46] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        กลับไปหน้าห้องพัก
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
        <div className="flex items-center gap-4">
          <span className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl shrink-0 ${icon}`}>
            <BedDouble size={26} strokeWidth={2.25} />
          </span>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-[#18181B] tracking-tight">ห้อง {room.room_number}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge}`}>{label}</span>
            </div>
            <p className="text-sm text-[#71717A] mt-1">
              {room.floor != null ? `ชั้น ${room.floor}` : 'ไม่ระบุชั้น'} · ฿{room.rent_price.toLocaleString('th-TH')}/เดือน
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <DeleteRoomButton roomId={room.id} hasActiveTenants={tenants.length > 0} />
          <Link
            href={`/admin/rooms/${room.id}/edit`}
            className="inline-flex items-center gap-2 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <Pencil size={15} />
            แก้ไขห้อง
          </Link>
        </div>
      </div>

      <div className="space-y-5">
        {/* Room Specifications */}
        <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
          <h2 className="text-base font-bold text-[#18181B] mb-1">ข้อมูลห้องพัก</h2>
          <p className="text-sm text-[#71717A] mb-6">รายละเอียดปัจจุบันของห้องนี้</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <InfoField label="เลขห้อง" value={room.room_number} />
            <InfoField label="ชั้น" value={room.floor != null ? `ชั้น ${room.floor}` : '—'} />
            <InfoField label="ค่าเช่ารายเดือน" value={`฿${room.rent_price.toLocaleString('th-TH')}`} />
            <div>
              <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide mb-1.5">สถานะ</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badge}`}>{label}</span>
            </div>
          </div>
        </div>

        {/* Current Tenants */}
        <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#71717A]" />
              <h2 className="text-base font-bold text-[#18181B]">ผู้เช่าปัจจุบัน</h2>
            </div>
            <Link
              href={`/admin/tenants/new?room=${room.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF6A00] hover:text-[#C2410C] transition-colors"
            >
              <Plus size={12} />
              เพิ่มผู้เช่า
            </Link>
          </div>
          <p className="text-sm text-[#71717A] mb-6">รายชื่อผู้เช่าที่ยัง active อยู่ในห้องนี้</p>

          {tenants && tenants.length > 0 ? (
            <div className="space-y-3">
              {tenants.map(t => {
                const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
                const initials = profile?.full_name
                  ? (profile.full_name as string).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  : '?'
                return (
                  <Link
                    key={t.id}
                    href={`/admin/tenants/${t.id}`}
                    className="flex items-center gap-3 p-4 bg-[#FFFAF7] hover:bg-[#FFF1E0] rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FFD9B3] flex items-center justify-center text-sm font-bold text-[#C2410C] shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#18181B] truncate">{profile?.full_name ?? '—'}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone size={11} className="text-[#71717A]" />
                        <p className="text-xs text-[#71717A]">{profile?.phone ?? 'ไม่มีเบอร์โทร'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end text-[#71717A]">
                        <Calendar size={11} />
                        <p className="text-xs">เข้าพัก</p>
                      </div>
                      <p className="text-xs font-semibold text-[#3F3F46] mt-0.5">
                        {new Date(t.move_in_date).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#E4E4E7] p-8 text-center">
              <UserRound size={24} className="text-[#A1A1AA] mx-auto mb-2" />
              <p className="text-sm text-[#71717A]">ยังไม่มีผู้เช่าในห้องนี้</p>
              <Link
                href={`/admin/tenants/new?room=${room.id}`}
                className="inline-block mt-3 text-xs font-semibold text-[#FF6A00] hover:text-[#C2410C] transition-colors"
              >
                มอบหมายผู้เช่า →
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
      <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-sm font-semibold text-[#18181B]">{value}</p>
    </div>
  )
}
