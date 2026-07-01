'use client'

import { Printer } from 'lucide-react'

export default function PrintReceiptButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
    >
      <Printer size={15} />
      Print / Download
    </button>
  )
}
