import { createClient } from '@/lib/supabase/server'
import ProfileEditForm from './ProfileEditForm'

type ActiveTenant = {
  move_in_date: string
  rooms: { room_number: string; floor: number | null } | null
}

export default async function TenantProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: rawProfile }, { data: rawTenant }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, phone').eq('id', user!.id).single(),
    supabase
      .from('tenants')
      .select('move_in_date, rooms(room_number, floor)')
      .eq('profile_id', user!.id)
      .eq('status', 'active')
      .order('move_in_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const profile = rawProfile as unknown as { id: string; full_name: string; phone: string | null }
  const activeTenant = rawTenant as unknown as ActiveTenant | null

  const moveIn = activeTenant
    ? new Date(activeTenant.move_in_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#18181B]">โปรไฟล์</h1>
        <p className="text-sm text-[#71717A] mt-1">ข้อมูลส่วนตัวของคุณ</p>
      </div>

      <div className="max-w-2xl space-y-5">
        {activeTenant && (
          <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
            <h2 className="text-base font-bold text-[#18181B] mb-1">ข้อมูลห้องพัก</h2>
            <p className="text-sm text-[#71717A] mb-6">จัดการโดยผู้ดูแลหอพัก แก้ไขเองไม่ได้</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
              <InfoField
                label="ห้องพัก"
                value={activeTenant.rooms ? `ห้อง ${activeTenant.rooms.room_number}${activeTenant.rooms.floor != null ? ` · ชั้น ${activeTenant.rooms.floor}` : ''}` : '—'}
              />
              <InfoField label="วันที่เข้าพัก" value={moveIn ?? '—'} />
            </div>
          </div>
        )}

        <ProfileEditForm profile={profile} />
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
