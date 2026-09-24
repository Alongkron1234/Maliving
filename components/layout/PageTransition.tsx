'use client'

import { usePathname } from 'next/navigation'

// Re-keys on every route change so the fade/slide-up animation replays per page
// instead of only once on the very first load.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="animate-admin-page-in">
      {children}
    </div>
  )
}
