import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import RoomEditForm from './RoomEditForm'
import type { Room } from '@/lib/types/database'

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawRoom } = await supabase.from('rooms').select('*').eq('id', id).single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const room: Room | null = rawRoom as any

  if (!room) notFound()

  const { count } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', id)
    .eq('status', 'active')
  const hasActiveTenants = (count ?? 0) > 0

  return (
    <div className="p-8">
      <Link
        href={`/admin/rooms/${room.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[#897362] hover:text-[#564334] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Back to Room {room.room_number}
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#241912]">Edit Room {room.room_number}</h1>
        <p className="text-sm text-[#897362] mt-1">Update the specifications for this room unit.</p>
      </div>

      <div className="max-w-2xl">
        <RoomEditForm room={room} hasActiveTenants={hasActiveTenants} />
      </div>
    </div>
  )
}