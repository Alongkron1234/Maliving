import { createClient } from '@/lib/supabase/server'
import { Megaphone, Pin } from 'lucide-react'
import type { Announcement } from '@/lib/types/database'

export default async function TenantAnnouncementsPage() {
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('announcements')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
  const announcements = (raw as unknown as Announcement[]) ?? []

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#241912]">ประกาศ</h1>
        <p className="text-sm text-[#897362] mt-1">ข่าวสารและประกาศจากผู้ดูแลหอพัก</p>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#ddc1ae] p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#fff1e9] flex items-center justify-center mx-auto mb-4">
            <Megaphone size={28} className="text-[#897362]" />
          </div>
          <p className="text-sm font-semibold text-[#564334]">ยังไม่มีประกาศ</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => {
            const createdAt = new Date(a.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            return (
              <div
                key={a.id}
                className={`bg-white rounded-2xl border border-[#ddc1ae] shadow-[0_0_15px_rgba(144,77,0,0.06)] p-6 ${
                  a.is_pinned ? 'border-l-4 border-l-[#ff8c00]' : ''
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  {a.is_pinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fff1e9] text-[#904d00]">
                      <Pin size={10} />
                      Pinned
                    </span>
                  )}
                  <span className="text-xs text-[#c9a990]">{createdAt}</span>
                </div>
                <h2 className="text-base font-bold text-[#241912] mb-1.5">{a.title}</h2>
                <p className="text-sm text-[#564334] whitespace-pre-wrap">{a.body}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
