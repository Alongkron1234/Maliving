import AdminSidebar from '@/components/layout/AdminSidebar'
import AdminTopBar from '@/components/layout/AdminTopBar'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let fullName = 'Admin'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    fullName = (profile as { full_name: string } | null)?.full_name ?? fullName
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#FFF8F5]">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <AdminTopBar fullName={fullName} />
        {children}
      </main>
    </div>
  )
}
