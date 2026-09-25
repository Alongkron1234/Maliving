'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { MaintenancePriority } from '@/lib/types/database'

type RoomOption = { id: string; room_number: string; floor: number | null }

export default function MaintenanceNewForm({
  rooms,
  initialRoomId,
}: {
  rooms: RoomOption[]
  initialRoomId?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [priority, setPriority] = useState<MaintenancePriority>('medium')

  const startId = (initialRoomId && rooms.some(r => r.id === initialRoomId))
    ? initialRoomId
    : rooms[0]?.id ?? ''

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const room_id = (form.elements.namedItem('room_id') as HTMLSelectElement).value
    const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim()
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value.trim()

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from('maintenance_requests')
      .insert({
        room_id,
        title,
        description: description || null,
        priority,
        status: 'open',
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/admin/maintenance')
    router.refresh()
  }

  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E4E4E7] p-12 shadow-[0_0_15px_rgba(144,77,0,0.06)] text-center">
        <p className="text-sm text-[#71717A]">ยังไม่มีห้องพัก — เพิ่มห้องก่อน</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl border border-[#E4E4E7] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
        <h2 className="text-base font-bold text-[#18181B] mb-1">Request Details</h2>
        <p className="text-sm text-[#71717A] mb-7">Describe the issue and where it&apos;s located.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
          <Field label="Room">
            <select name="room_id" defaultValue={startId} className={inputClass}>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number}{r.floor != null ? ` (Floor ${r.floor})` : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority">
            <div className="flex gap-1.5 h-[42px]">
              {(['low', 'medium', 'high'] as MaintenancePriority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    priority === p
                      ? p === 'high' ? 'bg-[#DC2626] text-white shadow-sm' : 'bg-[#FF6A00] text-white shadow-sm'
                      : 'bg-[#FFE8D1] text-[#71717A] hover:bg-[#FFD9B3] hover:text-[#3F3F46]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>

          <div className="col-span-2">
            <Field label="Title">
              <input
                name="title"
                type="text"
                required
                placeholder="e.g. แอร์ไม่เย็น"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="col-span-2">
            <Field label="Description (optional)">
              <textarea
                name="description"
                rows={4}
                placeholder="รายละเอียดเพิ่มเติม"
                className={`${inputClass} h-auto py-3 resize-none`}
              />
            </Field>
          </div>
        </div>

        {error && (
          <p className="text-sm text-[#DC2626] bg-[#FEE2E2] px-4 py-2.5 rounded-lg mt-6">{error}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <Link
          href="/admin/maintenance"
          className="px-6 py-2.5 bg-white border border-[#E4E4E7] text-[#3F3F46] text-sm font-semibold rounded-lg hover:border-[#C2410C] hover:text-[#C2410C] transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'Create Request'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#18181B] mb-2">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full h-[42px] px-3.5 bg-[#FFFAF7] border border-[#E4E4E7] rounded-lg text-sm text-[#18181B] ' +
  'outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 transition-all ' +
  'placeholder:text-[#A1A1AA]'
