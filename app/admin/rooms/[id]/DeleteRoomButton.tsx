'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export default function DeleteRoomButton({
  roomId,
  hasActiveTenants,
}: {
  roomId: string
  hasActiveTenants: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (hasActiveTenants) {
      setError('ต้องย้ายผู้เช่าออกก่อนลบห้อง')
      return
    }
    if (!window.confirm('ลบห้องนี้พร้อมข้อมูลมิเตอร์และบิลทั้งหมด? ไม่สามารถกู้คืนได้')) return

    setLoading(true)
    setError(null)

    const res = await fetch(`/api/admin/delete-room?id=${roomId}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json()
      setError(body.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/admin/rooms')
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleDelete}
        disabled={loading}
        className="inline-flex items-center gap-2 border border-[#ffdad6] text-[#93000a] text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#ffdad6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 size={15} />
        {loading ? 'Deleting…' : 'Delete Room'}
      </button>
      {error && (
        <p className="text-xs text-[#ba1a1a] max-w-xs text-right">{error}</p>
      )}
    </div>
  )
}