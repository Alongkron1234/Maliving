'use client'

import { Printer } from 'lucide-react'

export default function PrintReceiptButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
    >
      <Printer size={15} />
      Print / Download
    </button>
  )
}
