'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export default function DeleteBillButton({ billId }: { billId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!window.confirm('ลบบิลนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) return

    setLoading(true)
    await fetch(`/api/admin/delete-bill?id=${billId}`, { method: 'DELETE' })
    router.push('/admin/bills')
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-2 border border-[#FEE2E2] text-[#B91C1C] text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#FEE2E2] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <Trash2 size={15} />
      {loading ? 'กำลังลบ…' : 'Delete'}
    </button>
  )
}