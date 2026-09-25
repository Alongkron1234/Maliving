import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, Wrench, Megaphone, Home } from 'lucide-react'
import { billStatusConfig, getEffectiveBillStatus } from '@/lib/bills'

const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

type ActiveTenant = {
  id: string
  room_id: string
  move_in_date: string
  rooms: { room_number: string; floor: number | null; rent_price: number } | null
}

export default async function TenantDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawTenant } = await supabase
    .from('tenants')
    .select('id, room_id, move_in_date, rooms(room_number, floor, rent_price)')
    .eq('profile_id', user!.id)
    .eq('status', 'active')
    .order('move_in_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  const activeTenant = rawTenant as unknown as ActiveTenant | null

  if (!activeTenant) {
    return (
      <div className="p-6 sm:p-8">
        <div className="rounded-2xl border-2 border-dashed border-[#E4E4E7] p-16 text-center">
          <p className="text-sm font-semibold text-[#3F3F46]">คุณยังไม่ได้รับมอบหมายห้องพัก</p>
          <p className="text-sm text-[#71717A] mt-1">กรุณาติดต่อผู้ดูแลหอพัก</p>
        </div>
      </div>
    )
  }

  const [{ data: rawLatestBill }, { count: openMaintenanceCount }, { data: rawLatestAnnouncement }] = await Promise.all([
    supabase
      .from('bills')
      .select('id, billing_month, billing_year, total_amount, status, due_date')
      .eq('tenant_id', activeTenant.id)
      .order('billing_year', { ascending: false })
      .order('billing_month', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('reported_by', user!.id)
      .in('status', ['open', 'in_progress']),
    supabase
      .from('announcements')
      .select('id, title, created_at')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  type LatestBill = { id: string; billing_month: number; billing_year: number; total_amount: number; status: 'unpaid' | 'paid' | 'overdue'; due_date: string | null }
  const latestBill = rawLatestBill as unknown as LatestBill | null
  const latestAnnouncement = rawLatestAnnouncement as unknown as { id: string; title: string; created_at: string } | null
  const room = activeTenant.rooms

  return (
    <div className="p-6 sm:p-8 space-y-5">
      {/* Room info */}
      <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[#FFE8D1] flex items-center justify-center shrink-0">
            <Home size={18} className="text-[#C2410C]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#18181B]">
              ห้อง {room?.room_number ?? '—'}{room?.floor != null ? ` · ชั้น ${room.floor}` : ''}
            </h1>
            <p className="text-sm text-[#71717A]">
              ค่าเช่า ฿{room?.rent_price.toLocaleString('th-TH') ?? '—'}/เดือน
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/tenant/bills"
          className="bg-white rounded-2xl border border-black/5 p-5 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] hover:shadow-[0_2px_4px_rgba(36,25,18,0.06),0_12px_32px_rgba(36,25,18,0.08)] hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText size={15} className="text-[#71717A]" />
            <span className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">บิลล่าสุด</span>
          </div>
          {latestBill ? (
            <>
              <p className="text-lg font-bold text-[#18181B]">
                ฿{latestBill.total_amount.toLocaleString('th-TH')}
              </p>
              <p className="text-xs text-[#71717A] mt-0.5">
                {monthNames[latestBill.billing_month - 1]} {latestBill.billing_year}
              </p>
              <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${billStatusConfig[getEffectiveBillStatus(latestBill)].className}`}>
                {billStatusConfig[getEffectiveBillStatus(latestBill)].label}
              </span>
            </>
          ) : (
            <p className="text-sm text-[#A1A1AA]">ยังไม่มีบิล</p>
          )}
        </Link>

        <Link
          href="/tenant/maintenance"
          className="bg-white rounded-2xl border border-black/5 p-5 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] hover:shadow-[0_2px_4px_rgba(36,25,18,0.06),0_12px_32px_rgba(36,25,18,0.08)] hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <Wrench size={15} className="text-[#71717A]" />
            <span className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">แจ้งซ่อมค้างอยู่</span>
          </div>
          <p className="text-lg font-bold text-[#18181B]">{openMaintenanceCount ?? 0} รายการ</p>
        </Link>

        <Link
          href="/tenant/announcements"
          className="bg-white rounded-2xl border border-black/5 p-5 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] hover:shadow-[0_2px_4px_rgba(36,25,18,0.06),0_12px_32px_rgba(36,25,18,0.08)] hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <Megaphone size={15} className="text-[#71717A]" />
            <span className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">ประกาศล่าสุด</span>
          </div>
          <p className="text-sm font-semibold text-[#18181B] line-clamp-2">
            {latestAnnouncement?.title ?? 'ยังไม่มีประกาศ'}
          </p>
        </Link>
      </div>
    </div>
  )
}
