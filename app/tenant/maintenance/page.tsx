import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Wrench } from 'lucide-react'
import type { MaintenanceStatus, MaintenancePriority } from '@/lib/types/database'

type RequestRow = {
  id: string
  title: string
  description: string | null
  status: MaintenanceStatus
  priority: MaintenancePriority
  created_at: string
}

const statusConfig: Record<MaintenanceStatus, { label: string; className: string }> = {
  open:        { label: 'รอดำเนินการ',  className: 'bg-[#fee2e2] text-[#dc2626]' },
  in_progress: { label: 'กำลังดำเนินการ', className: 'bg-[#FEF3C7] text-[#B45309]' },
  resolved:    { label: 'เสร็จสิ้น',    className: 'bg-[#e3f5ea] text-[#1e7e46]' },
  closed:      { label: 'ปิดงาน',      className: 'bg-[#F4F4F5] text-[#71717A]' },
}

const priorityConfig: Record<MaintenancePriority, { label: string; className: string }> = {
  low:    { label: 'ต่ำ',    className: 'bg-[#F4F4F5] text-[#71717A]' },
  medium: { label: 'ปานกลาง', className: 'bg-[#FFE8D1] text-[#C2410C]' },
  high:   { label: 'เร่งด่วน', className: 'bg-[#fee2e2] text-[#dc2626]' },
}

export default async function TenantMaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: raw } = await supabase
    .from('maintenance_requests')
    .select('id, title, description, status, priority, created_at')
    .eq('reported_by', user!.id)
    .order('created_at', { ascending: false })
  const requests = (raw as unknown as RequestRow[]) ?? []

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#18181B]">แจ้งซ่อม</h1>
          <p className="text-sm text-[#71717A] mt-1">รายการแจ้งซ่อมของคุณ</p>
        </div>
        <Link
          href="/tenant/maintenance/new"
          className="flex items-center justify-center gap-2 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <Plus size={16} />
          แจ้งซ่อมใหม่
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#E4E4E7] p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#FFE8D1] flex items-center justify-center mx-auto mb-4">
            <Wrench size={28} className="text-[#71717A]" />
          </div>
          <p className="text-sm font-semibold text-[#3F3F46]">ยังไม่มีรายการแจ้งซ่อม</p>
          <Link
            href="/tenant/maintenance/new"
            className="inline-block mt-4 text-sm font-semibold text-[#FF6A00] hover:text-[#C2410C] transition-colors"
          >
            แจ้งซ่อมรายการแรก →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const createdAt = new Date(req.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-black/5 p-5 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-bold text-[#18181B]">{req.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityConfig[req.priority].className}`}>
                      {priorityConfig[req.priority].label}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig[req.status].className}`}>
                      {statusConfig[req.status].label}
                    </span>
                  </div>
                </div>
                {req.description && (
                  <p className="text-sm text-[#3F3F46] whitespace-pre-wrap">{req.description}</p>
                )}
                <p className="text-xs text-[#A1A1AA] mt-3">{createdAt}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
