import AdminSidebar from '@/components/layout/AdminSidebar'
import AdminTopBar from '@/components/layout/AdminTopBar'
import PageTransition from '@/components/layout/PageTransition'
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
    <div className="flex flex-col min-h-screen bg-[#FFFAF7]">
      <AdminSidebar />
      {/* lg:pl matches the sidebar's collapsed rail width — the sidebar itself is
          position:fixed so it never pushes this layout; it overlays on hover instead. */}
      <main className="flex-1 min-w-0 overflow-auto lg:pl-[76px]">
        <AdminTopBar fullName={fullName} />
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
