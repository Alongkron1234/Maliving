import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TenantEditForm from './TenantEditForm'

type TenantForEdit = {
  id: string
  move_in_date: string
  profiles: { id: string; full_name: string; phone: string | null } | null
}

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawTenant } = await supabase
    .from('tenants')
    .select('id, move_in_date, profiles(*)')
    .eq('id', id)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant: TenantForEdit | null = rawTenant as any

  if (!tenant || !tenant.profiles) notFound()

  const profile = tenant.profiles

  return (
    <div className="p-8">
      <Link
        href={`/admin/tenants/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[#897362] hover:text-[#564334] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Back to {profile.full_name}
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#241912]">Edit {profile.full_name}</h1>
        <p className="text-sm text-[#897362] mt-1">Update this tenant&apos;s personal details.</p>
      </div>

      <div className="max-w-2xl">
        <TenantEditForm tenant={{ ...tenant, profiles: profile }} />
      </div>
    </div>
  )
}