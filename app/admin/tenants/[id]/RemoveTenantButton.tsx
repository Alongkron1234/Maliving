'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function RemoveTenantButton({
  tenantId,
  profileId,
  roomId,
  tenantName,
}: {
  tenantId: string
  profileId: string
  roomId: string
  tenantName: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRemove() {
    if (
      !window.confirm(
        `ให้ ${tenantName} ย้ายออก? บัญชีผู้ใช้จะถูกลบ และห้องจะถูกตั้งเป็นว่างถ้าไม่มีผู้เช่าคนอื่นเหลืออยู่`
      )
    )
      return

    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/remove-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, profile_id: profileId, room_id: roomId }),
    })

    const body = await res.json()

    if (!res.ok) {
      setError(body.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/admin/tenants')
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleRemove}
        disabled={loading}
        className="inline-flex items-center gap-2 border border-[#FEE2E2] text-[#B91C1C] text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#FEE2E2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogOut size={15} />
        {loading ? 'กำลังย้ายออก…' : 'ย้ายออก'}
      </button>
      {error && (
        <p className="text-xs text-[#DC2626] max-w-xs text-right">{error}</p>
      )}
    </div>
  )
}