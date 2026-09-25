import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Megaphone } from 'lucide-react'
import type { Announcement } from '@/lib/types/database'
import AnnouncementRow from './AnnouncementRow'

export default async function AnnouncementsPage() {
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('announcements')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
  const announcements = (raw as unknown as Announcement[]) ?? []

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#18181B] tracking-tight">ประกาศ</h1>
          <p className="text-sm text-[#71717A] mt-1.5">โพสต์ข่าวสารให้ผู้เช่าทุกคนเห็น</p>
        </div>
        <Link
          href="/admin/announcements/new"
          className="inline-flex items-center justify-center gap-2 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap"
        >
          <Plus size={16} />
          สร้างประกาศ
        </Link>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#E4E4E7] p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#FFE8D1] flex items-center justify-center mx-auto mb-4">
            <Megaphone size={28} className="text-[#C2410C]" />
          </div>
          <p className="text-sm font-semibold text-[#3F3F46]">ยังไม่มีประกาศ</p>
          <Link
            href="/admin/announcements/new"
            className="inline-block mt-4 text-sm font-semibold text-[#FF6A00] hover:text-[#C2410C] transition-colors"
          >
            สร้างประกาศแรก →
          </Link>
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {announcements.map(a => (
            <AnnouncementRow
              key={a.id}
              id={a.id}
              title={a.title}
              body={a.body}
              isPinned={a.is_pinned}
              createdAt={new Date(a.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
