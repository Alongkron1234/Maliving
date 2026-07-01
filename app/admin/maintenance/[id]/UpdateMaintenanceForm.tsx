'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MaintenanceStatus, MaintenancePriority } from '@/lib/types/database'

const STATUSES: MaintenanceStatus[] = ['open', 'in_progress', 'resolved', 'closed']
const PRIORITIES: MaintenancePriority[] = ['low', 'medium', 'high']

const inputClass =
  'w-full h-[42px] px-3.5 bg-[#fff8f5] border border-[#ddc1ae] rounded-lg text-sm text-[#241912] ' +
  'outline-none focus:border-[#ff8c00] focus:ring-2 focus:ring-[#ff8c00]/20 transition-all capitalize'

export default function UpdateMaintenanceForm({
  requestId,
  initialStatus,
  initialPriority,
}: {
  requestId: string
  initialStatus: MaintenanceStatus
  initialPriority: MaintenancePriority
}) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [priority, setPriority] = useState(initialPriority)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty = status !== initialStatus || priority !== initialPriority

  async function handleSave() {
    setError(null)
    setLoading(true)

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('maintenance_requests')
      .update({ status, priority, updated_at: new Date().toISOString() })
      .eq('id', requestId)

    setLoading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
      <h2 className="text-base font-bold text-[#241912] mb-1">Update Status</h2>
      <p className="text-sm text-[#897362] mb-6">Track progress on this request.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5 mb-6">
        <div>
          <label className="block text-sm font-semibold text-[#241912] mb-2">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as MaintenanceStatus)} className={inputClass}>
            {STATUSES.map(s => (
              <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#241912] mb-2">Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value as MaintenancePriority)} className={inputClass}>
            {PRIORITIES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg mb-6">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={loading || !dirty}
        className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          saved ? 'bg-[#f0fdf4] border border-[#86efac] text-[#16a34a]' : 'bg-[#ff8c00] hover:bg-[#904d00] text-white'
        }`}
      >
        {loading ? 'Saving…' : saved ? 'บันทึกแล้ว' : 'Save Changes'}
      </button>
    </div>
  )
}
