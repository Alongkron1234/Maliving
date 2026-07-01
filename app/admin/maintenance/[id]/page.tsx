import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Home } from 'lucide-react'
import type { MaintenanceStatus, MaintenancePriority } from '@/lib/types/database'
import UpdateMaintenanceForm from './UpdateMaintenanceForm'
import DeleteMaintenanceButton from './DeleteMaintenanceButton'

type RequestDetail = {
  id: string
  title: string
  description: string | null
  status: MaintenanceStatus
  priority: MaintenancePriority
  image_url: string | null
  created_at: string
  rooms: { id: string; room_number: string; floor: number | null } | null
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

export default async function MaintenanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawRequest } = await supabase
    .from('maintenance_requests')
    .select('*, rooms(id, room_number, floor)')
    .eq('id', id)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request: RequestDetail | null = rawRequest as any

  if (!request) notFound()

  const room = request.rooms
  const createdAt = new Date(request.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="p-8">
      <Link
        href="/admin/maintenance"
        className="inline-flex items-center gap-1.5 text-sm text-[#897362] hover:text-[#564334] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Back to Maintenance
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#241912]">{request.title}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[request.status].className}`}>
              {statusConfig[request.status].label}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityConfig[request.priority].className}`}>
              {priorityConfig[request.priority].label} priority
            </span>
          </div>
          <p className="text-sm text-[#897362] mt-0.5">แจ้งเมื่อ {createdAt}</p>
        </div>
        <div className="flex items-start gap-3">
          {room && (
            <Link
              href={`/admin/rooms/${room.id}`}
              className="inline-flex items-center gap-2 border border-[#ddc1ae] text-[#564334] text-sm font-semibold px-4 py-2.5 rounded-lg hover:border-[#904d00] hover:text-[#904d00] transition-colors"
            >
              <Home size={15} />
              Room {room.room_number}
            </Link>
          )}
          <DeleteMaintenanceButton requestId={request.id} />
        </div>
      </div>

      <div className="max-w-2xl space-y-5">
        <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
          <h2 className="text-base font-bold text-[#241912] mb-1">Request Details</h2>
          <p className="text-sm text-[#897362] mb-6">
            {room ? `Room ${room.room_number}${room.floor != null ? ` · Floor ${room.floor}` : ''}` : 'No room'}
          </p>
          <p className="text-sm text-[#564334] whitespace-pre-wrap">
            {request.description || <span className="text-[#c9a990]">ไม่มีรายละเอียดเพิ่มเติม</span>}
          </p>

          {request.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={request.image_url}
              alt="Maintenance issue"
              className="mt-5 rounded-xl border border-[#ddc1ae] max-h-80 object-cover"
            />
          )}
        </div>

        <UpdateMaintenanceForm
          requestId={request.id}
          initialStatus={request.status}
          initialPriority={request.priority}
        />
      </div>
    </div>
  )
}
