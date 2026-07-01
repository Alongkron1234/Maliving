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
    ? new Date(activeTenant.move_in_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#241912]">โปรไฟล์</h1>
        <p className="text-sm text-[#897362] mt-1">ข้อมูลส่วนตัวของคุณ</p>
      </div>

      <div className="max-w-2xl space-y-5">
        {activeTenant && (
          <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
            <h2 className="text-base font-bold text-[#241912] mb-1">ข้อมูลห้องพัก</h2>
            <p className="text-sm text-[#897362] mb-6">จัดการโดยผู้ดูแลหอพัก แก้ไขเองไม่ได้</p>

            <div className="grid grid-cols-2 gap-x-5 gap-y-5">
              <InfoField
                label="Room"
                value={activeTenant.rooms ? `Room ${activeTenant.rooms.room_number}${activeTenant.rooms.floor != null ? ` · Floor ${activeTenant.rooms.floor}` : ''}` : '—'}
              />
              <InfoField label="Move-in Date" value={moveIn ?? '—'} />
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
      <p className="text-xs font-semibold text-[#897362] uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-sm font-semibold text-[#241912]">{value}</p>
    </div>
  )
}
