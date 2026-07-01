import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MaintenanceNewForm from './MaintenanceNewForm'

type RoomOption = { id: string; room_number: string; floor: number | null }

export default async function NewMaintenanceRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>
}) {
  const { room: roomParam } = await searchParams
  const supabase = await createClient()

  const { data: rawRooms } = await supabase
    .from('rooms')
    .select('id, room_number, floor')
    .order('room_number')
  const rooms: RoomOption[] = (rawRooms as unknown as RoomOption[]) ?? []

  return (
    <div className="p-8">
      <Link
        href="/admin/maintenance"
        className="inline-flex items-center gap-1.5 text-sm text-[#897362] hover:text-[#564334] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Back to Maintenance
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#241912]">New Maintenance Request</h1>
        <p className="text-sm text-[#897362] mt-1">Log a repair request for a room.</p>
      </div>

      <div className="max-w-2xl">
        <MaintenanceNewForm rooms={rooms} initialRoomId={roomParam} />
      </div>
    </div>
  )
}
