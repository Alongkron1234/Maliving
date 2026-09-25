'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Announcement } from '@/lib/types/database'

export default function AnnouncementEditForm({ announcement }: { announcement: Announcement }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPinned, setIsPinned] = useState(announcement.is_pinned)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim()
    const body = (form.elements.namedItem('body') as HTMLTextAreaElement).value.trim()

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('announcements')
      .update({ title, body, is_pinned: isPinned, updated_at: new Date().toISOString() })
      .eq('id', announcement.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/admin/announcements')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl border border-[#E4E4E7] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
        <h2 className="text-base font-bold text-[#18181B] mb-1">Announcement Details</h2>
        <p className="text-sm text-[#71717A] mb-7">Update the title and content of your announcement.</p>

        <div className="space-y-6">
          <Field label="Title">
            <input
              name="title"
              type="text"
              required
              defaultValue={announcement.title}
              className={inputClass}
            />
          </Field>

          <Field label="Content">
            <textarea
              name="body"
              required
              rows={6}
              defaultValue={announcement.body}
              className={`${inputClass} h-auto py-3 resize-none`}
            />
          </Field>

          <label className="flex items-center gap-2.5 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={e => setIsPinned(e.target.checked)}
              className="w-4 h-4 accent-[#FF6A00]"
            />
            <span className="text-sm font-medium text-[#3F3F46]">ปักหมุดไว้ด้านบน</span>
          </label>
        </div>

        {error && (
          <p className="text-sm text-[#DC2626] bg-[#FEE2E2] px-4 py-2.5 rounded-lg mt-6">{error}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <Link
          href="/admin/announcements"
          className="px-6 py-2.5 bg-white border border-[#E4E4E7] text-[#3F3F46] text-sm font-semibold rounded-lg hover:border-[#C2410C] hover:text-[#C2410C] transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'Save Changes'}
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
