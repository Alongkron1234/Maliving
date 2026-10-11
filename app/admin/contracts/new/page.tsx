import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import NewContractForm, { type TenantOption } from './NewContractForm'

type TenantRow = {
  id: string
  profiles: { full_name: string } | null
  rooms: { room_number: string; rent_price: number } | null
}

export default async function NewContractPage() {
  const supabase = await createClient()

  const [{ data: rawTenants }, { data: rawActive }] = await Promise.all([
    supabase.from('tenants').select('id, profiles(full_name), rooms(room_number, rent_price)').eq('status', 'active'),
    supabase.from('contracts').select('tenant_id').eq('status', 'active'),
  ])

  // Only offer tenants who don't already have an active contract (the database enforces
  // this too — this just keeps the dropdown from offering choices that would be rejected)
  const hasActive = new Set(((rawActive as unknown as { tenant_id: string }[]) ?? []).map(c => c.tenant_id))
  const options: TenantOption[] = ((rawTenants as unknown as TenantRow[]) ?? [])
    .filter(t => !hasActive.has(t.id))
    .map(t => ({
      id: t.id,
      name: t.profiles?.full_name ?? '—',
      roomNumber: t.rooms?.room_number ?? '—',
      rentPrice: t.rooms?.rent_price ?? 0,
    }))
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }))

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <Link
        href="/admin/contracts"
        className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#3F3F46] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        กลับไปหน้าสัญญาเช่า
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#18181B]">สร้างสัญญาเช่า</h1>
        <p className="text-sm text-[#71717A] mt-1">เลือกผู้เช่าและกำหนดช่วงเวลาของสัญญา</p>
      </div>

      <NewContractForm tenants={options} />
    </div>
  )
}
