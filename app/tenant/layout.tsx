import TenantTopNav from '@/components/layout/TenantTopNav'
import PageTransition from '@/components/layout/PageTransition'

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="tenant-shell min-h-screen bg-[#FFFAF7]">
      <TenantTopNav />
      <main className="max-w-4xl mx-auto">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
