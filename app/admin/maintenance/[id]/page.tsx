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
  open:        { label: 'Open',        className: 'bg-[#FEE2E2] text-[#B91C1C]' },
  in_progress: { label: 'In Progress', className: 'bg-[#FEF3C7] text-[#B45309]' },
  resolved:    { label: 'Resolved',    className: 'bg-[#f0fdf4] text-[#16a34a]' },
  closed:      { label: 'Closed',      className: 'bg-[#F4F4F5] text-[#71717A]' },
}

const priorityConfig: Record<MaintenancePriority, { label: string; className: string }> = {
  low:    { label: 'Low',    className: 'bg-[#F4F4F5] text-[#71717A]' },
  medium: { label: 'Medium', className: 'bg-[#FFE8D1] text-[#C2410C]' },
  high:   { label: 'High',   className: 'bg-[#FEE2E2] text-[#B91C1C]' },
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
        className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#3F3F46] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Back to Maintenance
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-7">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#18181B]">{request.title}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[request.status].className}`}>
              {statusConfig[request.status].label}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityConfig[request.priority].className}`}>
              {priorityConfig[request.priority].label} priority
            </span>
          </div>
          <p className="text-sm text-[#71717A] mt-0.5">แจ้งเมื่อ {createdAt}</p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {room && (
            <Link
              href={`/admin/rooms/${room.id}`}
              className="inline-flex items-center gap-2 border border-[#E4E4E7] text-[#3F3F46] text-sm font-semibold px-4 py-2.5 rounded-lg hover:border-[#C2410C] hover:text-[#C2410C] transition-colors"
            >
              <Home size={15} />
              Room {room.room_number}
            </Link>
          )}
          <DeleteMaintenanceButton requestId={request.id} />
        </div>
      </div>

      <div className="max-w-2xl space-y-5">
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
          <h2 className="text-base font-bold text-[#18181B] mb-1">Request Details</h2>
          <p className="text-sm text-[#71717A] mb-6">
            {room ? `Room ${room.room_number}${room.floor != null ? ` · Floor ${room.floor}` : ''}` : 'No room'}
          </p>
          <p className="text-sm text-[#3F3F46] whitespace-pre-wrap">
            {request.description || <span className="text-[#A1A1AA]">ไม่มีรายละเอียดเพิ่มเติม</span>}
          </p>

          {request.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={request.image_url}
              alt="Maintenance issue"
              className="mt-5 rounded-xl border border-[#E4E4E7] max-h-80 object-cover"
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
