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
    <div className="p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#18181B]">ประกาศ</h1>
        <p className="text-sm text-[#71717A] mt-1">ข่าวสารและประกาศจากผู้ดูแลหอพัก</p>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#E4E4E7] p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#FFE8D1] flex items-center justify-center mx-auto mb-4">
            <Megaphone size={28} className="text-[#71717A]" />
          </div>
          <p className="text-sm font-semibold text-[#3F3F46]">ยังไม่มีประกาศ</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => {
            const createdAt = new Date(a.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
            return (
              <div
                key={a.id}
                className={`bg-white rounded-2xl border border-black/5 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)] p-6 ${
                  a.is_pinned ? 'border-l-4 border-l-[#FF6A00]' : ''
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  {a.is_pinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFE8D1] text-[#C2410C]">
                      <Pin size={10} />
                      ปักหมุด
                    </span>
                  )}
                  <span className="text-xs text-[#A1A1AA]">{createdAt}</span>
                </div>
                <h2 className="text-base font-bold text-[#18181B] mb-1.5">{a.title}</h2>
                <p className="text-sm text-[#3F3F46] whitespace-pre-wrap">{a.body}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
