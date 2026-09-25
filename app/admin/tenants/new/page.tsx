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
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <Link
        href="/admin/tenants"
        className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#3F3F46] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        กลับไปหน้าผู้เช่า
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#18181B]">เพิ่มผู้เช่าใหม่</h1>
        <p className="text-sm text-[#71717A] mt-1">
          ลงทะเบียนผู้เช่าใหม่และมอบหมายห้องพักที่ว่าง
        </p>
      </div>

      <TenantNewForm rooms={rooms} defaultRoomId={room} />
    </div>
  )
}