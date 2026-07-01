import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TenantNewForm from './TenantNewForm'

type RoomOption = { id: string; room_number: string; floor: number | null }

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>
}) {
  const { room } = await searchParams
  const supabase = await createClient()

  const { data: rawRooms } = await supabase
    .from('rooms')
    .select('id, room_number, floor')
    .eq('status', 'available')
    .order('room_number')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rooms: RoomOption[] = (rawRooms as any) ?? []

  return (
    <div className="p-8">
      <Link
        href="/admin/tenants"
        className="inline-flex items-center gap-1.5 text-sm text-[#897362] hover:text-[#564334] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Back to Tenants
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#241912]">Add New Tenant</h1>
        <p className="text-sm text-[#897362] mt-1">
          Register a new tenant and assign them to an available room.
        </p>
      </div>

      <div className="max-w-2xl">
        <TenantNewForm rooms={rooms} defaultRoomId={room} />
      </div>
    </div>
  )
}