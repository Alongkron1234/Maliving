'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Pin, PinOff, Pencil, Trash2 } from 'lucide-react'

export default function AnnouncementRow({
  id,
  title,
  body,
  isPinned,
  createdAt,
}: {
  id: string
  title: string
  body: string
  isPinned: boolean
  createdAt: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function togglePin() {
    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('announcements')
      .update({ is_pinned: !isPinned, updated_at: new Date().toISOString() })
      .eq('id', id)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!window.confirm('ลบประกาศนี้? ไม่สามารถกู้คืนได้')) return
    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('announcements').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className={`bg-white rounded-2xl border p-6 shadow-[0_0_15px_rgba(144,77,0,0.06)] ${isPinned ? 'border-[#ff8c00]' : 'border-[#ddc1ae]'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isPinned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fff1e9] text-[#904d00]">
                <Pin size={10} />
                Pinned
              </span>
            )}
            <h2 className="text-base font-bold text-[#241912] truncate">{title}</h2>
          </div>
          <p className="text-sm text-[#564334] whitespace-pre-wrap">{body}</p>
          <p className="text-xs text-[#c9a990] mt-3">{createdAt}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={togglePin}
            disabled={loading}
            title={isPinned ? 'Unpin' : 'Pin to top'}
            className="w-8 h-8 rounded-lg border border-[#ddc1ae] flex items-center justify-center hover:border-[#904d00] hover:text-[#904d00] text-[#897362] transition-colors disabled:opacity-50"
          >
            {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>
          <Link
            href={`/admin/announcements/${id}/edit`}
            className="w-8 h-8 rounded-lg border border-[#ddc1ae] flex items-center justify-center hover:border-[#904d00] hover:text-[#904d00] text-[#897362] transition-colors"
          >
            <Pencil size={13} />
          </Link>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="w-8 h-8 rounded-lg border border-[#ffdad6] flex items-center justify-center hover:bg-[#ffdad6] text-[#93000a] transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
