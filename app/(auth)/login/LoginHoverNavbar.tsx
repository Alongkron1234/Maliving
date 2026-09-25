'use client'

import Link from 'next/link'

// Auto-hiding top navbar for the login page only — invisible by default, slides
// down when the cursor rests near the top edge. The outer div's hit-box stays a
// constant h-16 strip (regardless of the child's translate), so the mouse never
// has to leave the hoverable region while the bar animates into view.
export default function LoginHoverNavbar() {
  return (
    <div className="fixed top-0 inset-x-0 h-16 z-50 group">
      {/* Peek handle — hints that something is hidden up here, fades once revealed */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#E4E4E7] group-hover:opacity-0 transition-opacity duration-200" />

      <div
        className="absolute inset-x-0 top-0 h-16 -translate-y-full group-hover:translate-y-0
                   transition-transform duration-300 ease-out
                   bg-white/95 backdrop-blur-sm border-b border-black/5 shadow-sm
                   flex items-center justify-between px-6 lg:px-10"
      >
        <Link href="/" className="text-lg font-bold text-[#C2410C] tracking-tight">
          Maliving
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-[#3F3F46] hover:text-[#C2410C] transition-colors"
        >
          กลับหน้าแรก
        </Link>
      </div>
    </div>
  )
}
