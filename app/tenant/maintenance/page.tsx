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
  open:        { label: 'Open',        className: 'bg-[#ffdad6] text-[#93000a]' },
  in_progress: { label: 'In Progress', className: 'bg-[#fff3cd] text-[#8a6100]' },
  resolved:    { label: 'Resolved',    className: 'bg-[#f0fdf4] text-[#16a34a]' },
  closed:      { label: 'Closed',      className: 'bg-[#f5f5f5] text-[#897362]' },
}

const priorityConfig: Record<MaintenancePriority, { label: string; className: string }> = {
  low:    { label: 'Low',    className: 'bg-[#f5f5f5] text-[#897362]' },
  medium: { label: 'Medium', className: 'bg-[#fff1e9] text-[#904d00]' },
  high:   { label: 'High',   className: 'bg-[#ffdad6] text-[#93000a]' },
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
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#241912]">แจ้งซ่อม</h1>
          <p className="text-sm text-[#897362] mt-1">รายการแจ้งซ่อมของคุณ</p>
        </div>
        <Link
          href="/tenant/maintenance/new"
          className="flex items-center gap-2 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          แจ้งซ่อมใหม่
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#ddc1ae] p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#fff1e9] flex items-center justify-center mx-auto mb-4">
            <Wrench size={28} className="text-[#897362]" />
          </div>
          <p className="text-sm font-semibold text-[#564334]">ยังไม่มีรายการแจ้งซ่อม</p>
          <Link
            href="/tenant/maintenance/new"
            className="inline-block mt-4 text-sm font-semibold text-[#ff8c00] hover:text-[#904d00] transition-colors"
          >
            แจ้งซ่อมรายการแรก →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const createdAt = new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-[#ddc1ae] p-5 shadow-[0_0_15px_rgba(144,77,0,0.06)]"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-bold text-[#241912]">{req.title}</p>
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
                  <p className="text-sm text-[#564334] whitespace-pre-wrap">{req.description}</p>
                )}
                <p className="text-xs text-[#c9a990] mt-3">{createdAt}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
