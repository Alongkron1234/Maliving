'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'

export default function DeleteMaintenanceButton({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!window.confirm('ลบรายการแจ้งซ่อมนี้? ไม่สามารถกู้คืนได้')) return

    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('maintenance_requests').delete().eq('id', requestId)

    router.push('/admin/maintenance')
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-2 border border-[#ffdad6] text-[#93000a] text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#ffdad6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Trash2 size={15} />
      {loading ? 'Deleting…' : 'Delete'}
    </button>
  )
}
