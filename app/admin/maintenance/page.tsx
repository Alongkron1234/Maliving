import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Wrench, AlertCircle, Clock, CheckCircle2, type LucideIcon } from 'lucide-react'
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
  { value: undefined, label: 'ทั้งหมด' },
  { value: 'open', label: 'เปิดใหม่' },
  { value: 'in_progress', label: 'กำลังดำเนินการ' },
  { value: 'resolved', label: 'แก้ไขแล้ว' },
  { value: 'closed', label: 'ปิดงาน' },
]

const statusConfig: Record<MaintenanceStatus, { label: string; className: string }> = {
  open:        { label: 'เปิดใหม่',          className: 'bg-[#FEE2E2] text-[#B91C1C]' },
  in_progress: { label: 'กำลังดำเนินการ', className: 'bg-[#FEF3C7] text-[#B45309]' },
  resolved:    { label: 'แก้ไขแล้ว',        className: 'bg-[#f0fdf4] text-[#16a34a]' },
  closed:      { label: 'ปิดงาน',            className: 'bg-[#F4F4F5] text-[#71717A]' },
}

const priorityConfig: Record<MaintenancePriority, { label: string; className: string }> = {
  low:    { label: 'ทั่วไป',   className: 'bg-[#F4F4F5] text-[#71717A]' },
  medium: { label: 'ปานกลาง', className: 'bg-[#FFE8D1] text-[#C2410C]' },
  high:   { label: 'เร่งด่วน', className: 'bg-[#FEE2E2] text-[#B91C1C]' },
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  // Fetch everything once — the summary strip always reflects all requests
  // regardless of the active status tab, while the grid below filters client-side.
  const { data: raw } = await supabase
    .from('maintenance_requests')
    .select('id, title, description, status, priority, created_at, rooms(room_number, floor)')
    .order('created_at', { ascending: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRequests: RequestRow[] = (raw as any) ?? []
  const requests = status ? allRequests.filter(r => r.status === status) : allRequests

  const openCount = allRequests.filter(r => r.status === 'open').length
  const inProgressCount = allRequests.filter(r => r.status === 'in_progress').length
  const resolvedCount = allRequests.filter(r => r.status === 'resolved' || r.status === 'closed').length

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#18181B] tracking-tight">แจ้งซ่อม</h1>
          <p className="text-sm text-[#71717A] mt-1.5">ติดตามและจัดการรายการแจ้งซ่อมทุกห้อง</p>
        </div>
        <Link
          href="/admin/maintenance/new"
          className="inline-flex items-center justify-center gap-2 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap"
        >
          <Plus size={16} />
          แจ้งซ่อมใหม่
        </Link>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <SummaryPill icon={AlertCircle} tone="danger" label="เปิดใหม่" value={openCount} />
        <SummaryPill icon={Clock} tone="warning" label="กำลังดำเนินการ" value={inProgressCount} />
        <SummaryPill icon={CheckCircle2} tone="success" label="เสร็จแล้ว" value={resolvedCount} />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {statusTabs.map(tab => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/maintenance?status=${tab.value}` : '/admin/maintenance'}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              status === tab.value
                ? 'bg-[#FF6A00] text-white shadow-sm shadow-[#FF6A00]/30'
                : 'bg-white border border-[#E4E4E7] text-[#3F3F46] hover:border-[#FF6A00] hover:text-[#C2410C]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#E4E4E7] p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#FFE8D1] flex items-center justify-center mx-auto mb-4">
            <Wrench size={28} className="text-[#71717A]" />
          </div>
          <p className="text-sm font-semibold text-[#3F3F46]">ยังไม่มีรายการแจ้งซ่อม</p>
          <Link
            href="/admin/maintenance/new"
            className="inline-block mt-4 text-sm font-semibold text-[#FF6A00] hover:text-[#C2410C] transition-colors"
          >
            เพิ่มรายการแจ้งซ่อม →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map(req => {
            const room = req.rooms
            const createdAt = new Date(req.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

            return (
              <Link
                key={req.id}
                href={`/admin/maintenance/${req.id}`}
                className="bg-white rounded-2xl border border-black/5 p-5 flex flex-col gap-3 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] hover:shadow-[0_2px_4px_rgba(36,25,18,0.06),0_12px_32px_rgba(36,25,18,0.08)] hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFE8D1] text-[#C2410C] shrink-0">
                    {room ? `ห้อง ${room.room_number}` : '—'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${statusConfig[req.status].className}`}>
                    {statusConfig[req.status].label}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-bold text-[#18181B] line-clamp-1">{req.title}</p>
                  {req.description && (
                    <p className="text-xs text-[#71717A] mt-1 line-clamp-2">{req.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-auto pt-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityConfig[req.priority].className}`}>
                    {priorityConfig[req.priority].label}
                  </span>
                  <span className="text-[10px] text-[#A1A1AA]">{createdAt}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

const summaryTones = {
  danger:  'bg-[#FEE2E2] text-[#B91C1C]',
  warning: 'bg-[#FEF3C7] text-[#B45309]',
  success: 'bg-[#e3f5ea] text-[#1e7e46]',
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
  value: number
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-black/5 shadow-[0_1px_2px_rgba(36,25,18,0.04)] hover:shadow-[0_4px_16px_rgba(36,25,18,0.08)] transition-shadow">
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${summaryTones[tone]}`}>
        <Icon size={16} strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-[#18181B] leading-tight">{value}</p>
        <p className="text-[11px] text-[#71717A] truncate">{label}</p>
      </div>
    </div>
  )
}
