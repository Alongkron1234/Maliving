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
        `Move out ${tenantName}? Their account will be deleted and the room will be set to available if no other tenants remain.`
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
        className="inline-flex items-center gap-2 border border-[#ffdad6] text-[#93000a] text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#ffdad6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogOut size={15} />
        {loading ? 'Moving out…' : 'Move Out'}
      </button>
      {error && (
        <p className="text-xs text-[#ba1a1a] max-w-xs text-right">{error}</p>
      )}
    </div>
  )
}