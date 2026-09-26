'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { MaintenancePriority } from '@/lib/types/database'

const priorityLabels: Record<MaintenancePriority, string> = {
  low: 'ต่ำ',
  medium: 'ปานกลาง',
  high: 'เร่งด่วน',
}

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
      <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
        <h2 className="text-base font-bold text-[#18181B] mb-1">รายละเอียดการแจ้งซ่อม</h2>
        <p className="text-sm text-[#71717A] mb-7">อธิบายปัญหาและความเร่งด่วน</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
          <Field label="ห้องพัก">
            <div className="h-[42px] px-3.5 flex items-center bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg text-sm font-semibold text-[#18181B]">
              {roomLabel}
            </div>
          </Field>

          <Field label="ความเร่งด่วน">
            <div className="flex gap-1.5 h-[42px]">
              {(['low', 'medium', 'high'] as MaintenancePriority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 rounded-lg text-xs font-semibold transition-colors ${
                    priority === p
                      ? p === 'high' ? 'bg-[#DC2626] text-white shadow-sm' : 'bg-[#FF6A00] text-white shadow-sm'
                      : 'bg-[#FFFAF7] text-[#71717A] hover:bg-[#FFE8D1] hover:text-[#3F3F46]'
                  }`}
                >
                  {priorityLabels[p]}
                </button>
              ))}
            </div>
          </Field>

          <div className="col-span-2">
            <Field label="หัวข้อ">
              <input
                name="title"
                type="text"
                required
                placeholder="เช่น แอร์ไม่เย็น"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="col-span-2">
            <Field label="รายละเอียด (ถ้ามี)">
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
          <p className="text-sm text-[#DC2626] bg-[#fee2e2] px-4 py-2.5 rounded-lg mt-6">{error}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <Link
          href="/tenant/maintenance"
          className="px-6 py-2.5 bg-white border border-[#E4E4E7] text-[#3F3F46] text-sm font-semibold rounded-lg hover:border-[#C2410C] hover:text-[#C2410C] transition-colors"
        >
          ยกเลิก
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {loading ? 'กำลังบันทึก…' : 'ส่งเรื่องแจ้งซ่อม'}
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
