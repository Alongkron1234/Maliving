'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { MaintenancePriority } from '@/lib/types/database'

export default function MaintenanceNewForm({
  roomId,
  roomLabel,
}: {
  roomId: string
  roomLabel: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [priority, setPriority] = useState<MaintenancePriority>('medium')

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim()
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value.trim()

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from('maintenance_requests')
      .insert({
        room_id: roomId,
        reported_by: user!.id,
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

    router.push('/tenant/maintenance')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
        <h2 className="text-base font-bold text-[#241912] mb-1">Request Details</h2>
        <p className="text-sm text-[#897362] mb-7">อธิบายปัญหาและความเร่งด่วน</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
          <Field label="Room">
            <div className="h-[42px] px-3.5 flex items-center bg-[#f5f5f5] border border-[#ddc1ae] rounded-lg text-sm font-semibold text-[#241912]">
              {roomLabel}
            </div>
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
                      ? p === 'high' ? 'bg-[#ba1a1a] text-white shadow-sm' : 'bg-[#ff8c00] text-white shadow-sm'
                      : 'bg-[#fff1e9] text-[#897362] hover:bg-[#ffeadd] hover:text-[#564334]'
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
          <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg mt-6">{error}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <Link
          href="/tenant/maintenance"
          className="px-6 py-2.5 bg-white border border-[#ddc1ae] text-[#564334] text-sm font-semibold rounded-lg hover:border-[#904d00] hover:text-[#904d00] transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'ส่งเรื่องแจ้งซ่อม'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#241912] mb-2">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full h-[42px] px-3.5 bg-[#fff8f5] border border-[#ddc1ae] rounded-lg text-sm text-[#241912] ' +
  'outline-none focus:border-[#ff8c00] focus:ring-2 focus:ring-[#ff8c00]/20 transition-all ' +
  'placeholder:text-[#c9a990]'
