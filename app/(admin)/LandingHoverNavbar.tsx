'use client'

import Link from 'next/link'

// Auto-hiding top navbar for the landing page — invisible by default (just a
// small peek handle), slides down when the cursor rests near the top edge so
// the hero image can run full-bleed underneath. The outer div's hit-box stays
// a constant h-16 strip regardless of the child's translate, so the mouse
// never has to leave the hoverable region while the bar animates into view.
export default function LandingHoverNavbar() {
  return (
    <div className="fixed top-0 inset-x-0 h-16 z-50 group">
      {/* Peek handle — hints that something is hidden up here, fades once revealed */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/60 group-hover:opacity-0 transition-opacity duration-200" />

      <div
        className="absolute inset-x-0 top-0 h-16 -translate-y-full group-hover:translate-y-0
                   transition-transform duration-300 ease-out
                   bg-white/95 backdrop-blur-sm border-b border-black/5 shadow-sm
                   flex items-center justify-between px-6"
      >
        <span className="text-lg font-bold text-[#C2410C]">Maliving</span>
        <Link
          href="/login"
          className="bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    </div>
  )
}
