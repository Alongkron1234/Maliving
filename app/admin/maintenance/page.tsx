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
  rooms: { room_number: string; floor: number | null } | null
}

const statusTabs: { value: MaintenanceStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

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

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  const query = supabase
    .from('maintenance_requests')
    .select('id, title, description, status, priority, created_at, rooms(room_number, floor)')
    .order('created_at', { ascending: false })

  const { data: raw } = status ? await query.eq('status', status) : await query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: RequestRow[] = (raw as any) ?? []

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#241912]">Maintenance Requests</h1>
          <p className="text-sm text-[#897362] mt-1">Track and manage repair requests across all rooms.</p>
        </div>
        <Link
          href="/admin/maintenance/new"
          className="flex items-center justify-center gap-2 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Request
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {statusTabs.map(tab => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/maintenance?status=${tab.value}` : '/admin/maintenance'}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              status === tab.value
                ? 'bg-[#ff8c00] text-white'
                : 'bg-white border border-[#ddc1ae] text-[#564334] hover:border-[#ff8c00] hover:text-[#904d00]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#ddc1ae] p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#fff1e9] flex items-center justify-center mx-auto mb-4">
            <Wrench size={28} className="text-[#897362]" />
          </div>
          <p className="text-sm font-semibold text-[#564334]">ยังไม่มีรายการแจ้งซ่อม</p>
          <Link
            href="/admin/maintenance/new"
            className="inline-block mt-4 text-sm font-semibold text-[#ff8c00] hover:text-[#904d00] transition-colors"
          >
            เพิ่มรายการแจ้งซ่อม →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map(req => {
            const room = req.rooms
            const createdAt = new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

            return (
              <Link
                key={req.id}
                href={`/admin/maintenance/${req.id}`}
                className="bg-white rounded-2xl border border-[#ddc1ae] p-5 flex flex-col gap-3 shadow-[0_0_15px_rgba(144,77,0,0.06)] hover:shadow-[0_0_24px_rgba(144,77,0,0.12)] hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fff1e9] text-[#904d00] shrink-0">
                    {room ? `Room ${room.room_number}` : '—'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${statusConfig[req.status].className}`}>
                    {statusConfig[req.status].label}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-bold text-[#241912] line-clamp-1">{req.title}</p>
                  {req.description && (
                    <p className="text-xs text-[#897362] mt-1 line-clamp-2">{req.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-auto pt-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityConfig[req.priority].className}`}>
                    {priorityConfig[req.priority].label} priority
                  </span>
                  <span className="text-[10px] text-[#c9a990]">{createdAt}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
