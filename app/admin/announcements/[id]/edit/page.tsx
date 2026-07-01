import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Announcement } from '@/lib/types/database'
import AnnouncementEditForm from './AnnouncementEditForm'

export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: raw } = await supabase.from('announcements').select('*').eq('id', id).single()
  const announcement = raw as unknown as Announcement | null

  if (!announcement) notFound()

  return (
    <div className="p-8">
      <div className="mb-7">
        <Link
          href="/admin/announcements"
          className="inline-flex items-center gap-1.5 text-sm text-[#897362] hover:text-[#564334] transition-colors mb-4"
        >
          <ArrowLeft size={15} />
          Back to Announcements
        </Link>
        <h1 className="text-2xl font-bold text-[#241912]">Edit Announcement</h1>
        <p className="text-sm text-[#897362] mt-1">Update the title and content of this announcement.</p>
      </div>

      <div className="max-w-2xl">
        <AnnouncementEditForm announcement={announcement} />
      </div>
    </div>
  )
}
