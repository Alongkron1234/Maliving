'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  BedDouble,
  Users,
  Zap,
  FileText,
  CreditCard,
  Wrench,
  Megaphone,
  HelpCircle,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'แดชบอร์ด', icon: LayoutDashboard, exact: true },
  { href: '/admin/rooms', label: 'ห้องพัก', icon: BedDouble },
  { href: '/admin/tenants', label: 'ผู้เช่า', icon: Users },
  { href: '/admin/meters', label: 'มิเตอร์', icon: Zap },
  { href: '/admin/bills', label: 'บิล', icon: FileText },
  { href: '/admin/payments', label: 'ชำระเงิน', icon: CreditCard },
  { href: '/admin/maintenance', label: 'แจ้งซ่อม', icon: Wrench },
  { href: '/admin/announcements', label: 'ประกาศ', icon: Megaphone },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile top bar — hidden on lg+ where the sidebar is always visible */}
      <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between h-14 px-4 bg-white border-b border-[#ddc1ae] print:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-2 text-[#564334]"
          aria-label="เปิดเมนู"
        >
          <Menu size={20} />
        </button>
        <p className="text-sm font-bold text-[#904d00]">Maliving Admin</p>
        <div className="w-9" />
      </header>

      {/* Backdrop for the mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar — off-canvas drawer on mobile, static column on lg+ */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#ddc1ae] flex flex-col shrink-0 print:hidden
                    transition-transform duration-200 ease-out
                    lg:static lg:z-auto lg:w-56 lg:translate-x-0
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#ddc1ae] flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-[#904d00] leading-tight">Maliving Admin</p>
            <p className="text-xs text-[#897362] mt-0.5">Dormitory Management</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1 text-[#897362] hover:text-[#564334]"
            aria-label="ปิดเมนู"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#ffeadd] text-[#904d00]'
                    : 'text-[#897362] hover:bg-[#fff1e9] hover:text-[#564334]'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-[#ddc1ae] space-y-0.5">
          <Link
            href="/admin/help"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#897362] hover:bg-[#fff1e9] hover:text-[#564334] transition-colors"
          >
            <HelpCircle size={16} strokeWidth={2} />
            Help Center
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#897362] hover:bg-[#fff1e9] hover:text-[#564334] transition-colors"
          >
            <LogOut size={16} strokeWidth={2} />
            ออกจากระบบ
          </button>
        </div>
      </aside>
    </>
  )
}
