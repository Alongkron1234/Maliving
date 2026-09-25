'use client'

import { Download } from 'lucide-react'

type TenantRow = {
  id: string
  move_in_date: string
  profiles: { full_name: string; phone: string | null; line_connected_at: string | null } | null
  rooms: { room_number: string; floor: number | null } | null
}

function toCsvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export default function TenantsToolbar({ tenants }: { tenants: TenantRow[] }) {
  function handleExport() {
    const header = ['ชื่อ-นามสกุล', 'เบอร์โทร', 'ห้อง', 'วันที่เข้าพัก', 'เชื่อมต่อ Line Bot']
    const rows = tenants.map(t => [
      t.profiles?.full_name ?? '',
      t.profiles?.phone ?? '',
      t.rooms?.room_number ?? '',
      t.move_in_date,
      t.profiles?.line_connected_at ? 'เชื่อมแล้ว' : 'ยังไม่เชื่อม',
    ])

    const csv = ['﻿' + header.map(toCsvCell).join(','), ...rows.map(r => r.map(toCsvCell).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tenants-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#eef4ff] border border-black/5 text-[#2563eb] text-sm font-semibold px-4 py-2.5 rounded-lg shadow-[0_1px_2px_rgba(36,25,18,0.04)] transition-all whitespace-nowrap"
    >
      <Download size={16} />
      ส่งออก CSV
    </button>
  )
}
