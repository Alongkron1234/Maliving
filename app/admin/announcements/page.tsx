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
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#241912]">Announcements</h1>
          <p className="text-sm text-[#897362] mt-1">Post updates for all tenants to see.</p>
        </div>
        <Link
          href="/admin/announcements/new"
          className="flex items-center gap-2 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Announcement
        </Link>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#ddc1ae] p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#fff1e9] flex items-center justify-center mx-auto mb-4">
            <Megaphone size={28} className="text-[#897362]" />
          </div>
          <p className="text-sm font-semibold text-[#564334]">ยังไม่มีประกาศ</p>
          <Link
            href="/admin/announcements/new"
            className="inline-block mt-4 text-sm font-semibold text-[#ff8c00] hover:text-[#904d00] transition-colors"
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
              createdAt={new Date(a.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
