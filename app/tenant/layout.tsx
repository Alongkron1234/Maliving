import TenantTopNav from '@/components/layout/TenantTopNav'

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FFF8F5]">
      <TenantTopNav />
      <main className="max-w-4xl mx-auto">{children}</main>
    </div>
  )
}
