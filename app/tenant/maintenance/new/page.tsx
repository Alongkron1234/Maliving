import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MaintenanceNewForm from './MaintenanceNewForm'

type ActiveTenant = {
  room_id: string
  rooms: { room_number: string; floor: number | null } | null
}

export default async function NewTenantMaintenanceRequestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: raw } = await supabase
    .from('tenants')
    .select('room_id, rooms(room_number, floor)')
    .eq('profile_id', user!.id)
    .eq('status', 'active')
    .order('move_in_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  const activeTenant = raw as unknown as ActiveTenant | null

  return (
    <div className="p-8">
      <Link
        href="/tenant/maintenance"
        className="inline-flex items-center gap-1.5 text-sm text-[#897362] hover:text-[#564334] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Back to Maintenance
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#241912]">แจ้งซ่อมใหม่</h1>
        <p className="text-sm text-[#897362] mt-1">อธิบายปัญหาที่พบในห้องของคุณ</p>
      </div>

      {!activeTenant ? (
        <div className="max-w-2xl rounded-2xl border-2 border-dashed border-[#ddc1ae] p-16 text-center">
          <p className="text-sm font-semibold text-[#564334]">คุณยังไม่ได้รับมอบหมายห้องพัก</p>
          <p className="text-sm text-[#897362] mt-1">กรุณาติดต่อผู้ดูแลหอพัก</p>
        </div>
      ) : (
        <div className="max-w-2xl">
          <MaintenanceNewForm
            roomId={activeTenant.room_id}
            roomLabel={`Room ${activeTenant.rooms?.room_number ?? '—'}${activeTenant.rooms?.floor != null ? ` (Floor ${activeTenant.rooms.floor})` : ''}`}
          />
        </div>
      )}
    </div>
  )
}
