'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import type { MeterReading } from '@/lib/types/database'

type RoomRow = { id: string; room_number: string; floor: number | null }

export default function MeterTable({
  rooms,
  readingsByRoom,
  prevByRoom,
  ocrDraftByRoom,
  month,
  year,
}: {
  rooms: RoomRow[]
  readingsByRoom: Record<string, { electric?: MeterReading; water?: MeterReading }>
  prevByRoom: Record<string, { electric?: number; water?: number }>
  ocrDraftByRoom: Record<string, { electric?: number; water?: number }>
  month: number
  year: number
}) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(e: React.MouseEvent, room: RoomRow) {
    e.stopPropagation() // don't trigger row click → navigation
    if (!window.confirm(`ลบข้อมูลมิเตอร์ห้อง ${room.room_number} เดือนนี้?`)) return

    setDeletingId(room.id)
    await fetch(
      `/api/admin/meter-reading?room_id=${room.id}&month=${month}&year=${year}`,
      { method: 'DELETE' }
    )
    setDeletingId(null)
    router.refresh()
  }

  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E4E4E7] p-12 shadow-[0_0_15px_rgba(144,77,0,0.06)] text-center">
        <p className="text-sm text-[#71717A]">ยังไม่มีห้องพัก — เพิ่มห้องก่อนบันทึกมิเตอร์</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E4E4E7] shadow-[0_0_15px_rgba(144,77,0,0.06)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-[#FFFAF7] border-b border-[#E4E4E7]">
              <th className="text-left px-5 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">ห้อง</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">ชั้น</th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-[#FF6A00] uppercase tracking-wide" colSpan={3}>
                ⚡ ไฟฟ้า
              </th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-[#3b82f6] uppercase tracking-wide" colSpan={3}>
                💧 น้ำ
              </th>
              <th className="px-4 py-3" />
            </tr>
            <tr className="border-b border-[#F4F4F5]">
              <th colSpan={2} />
              <th className="px-4 py-2 text-[10px] font-semibold text-[#71717A] text-left">ก่อน</th>
              <th className="px-4 py-2 text-[10px] font-semibold text-[#71717A] text-left">หลัง</th>
              <th className="px-4 py-2 text-[10px] font-semibold text-[#FF6A00] text-left">หน่วย</th>
              <th className="px-4 py-2 text-[10px] font-semibold text-[#71717A] text-left">ก่อน</th>
              <th className="px-4 py-2 text-[10px] font-semibold text-[#71717A] text-left">หลัง</th>
              <th className="px-4 py-2 text-[10px] font-semibold text-[#3b82f6] text-left">หน่วย</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F4F5]">
            {rooms.map(room => {
              const e = readingsByRoom[room.id]?.electric
              const w = readingsByRoom[room.id]?.water
              const hasReading = !!(e || w)
              const method = e?.input_method ?? w?.input_method
              const isDeleting = deletingId === room.id

              const draft = ocrDraftByRoom[room.id]
              const hasDraft = !hasReading && !!(draft?.electric != null || draft?.water != null)

              const ePrevVal = e ? e.previous_reading : prevByRoom[room.id]?.electric
              const wPrevVal = w ? w.previous_reading : prevByRoom[room.id]?.water
              const hasPrev  = ePrevVal != null || wPrevVal != null

              const eCurrVal = e ? e.current_reading : draft?.electric
              const wCurrVal = w ? w.current_reading : draft?.water

              return (
                <tr
                  key={room.id}
                  onClick={() => !isDeleting && router.push(`/admin/meters/new?month=${month}&year=${year}&room=${room.id}`)}
                  className="cursor-pointer hover:bg-[#FFFAF7] transition-colors group"
                  title={
                    hasReading ? `แก้ไข / ลบมิเตอร์ห้อง ${room.room_number}` :
                    hasDraft ? `ตรวจสอบและยืนยันมิเตอร์ห้อง ${room.room_number} (OCR)` :
                    `กรอกมิเตอร์ห้อง ${room.room_number}`
                  }
                >
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-[#18181B] group-hover:text-[#FF6A00] transition-colors">
                      ห้อง {room.room_number}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#71717A]">
                    {room.floor != null ? `F${room.floor}` : '—'}
                  </td>

                  {/* Electric */}
                  <td className="px-4 py-3.5 tabular-nums text-[#3F3F46]">
                    {ePrevVal != null ? ePrevVal : <span className="text-[#A1A1AA]">—</span>}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-[#3F3F46]">
                    {eCurrVal != null
                      ? (e ? eCurrVal : <span className="italic text-[#2563EB]">{eCurrVal}?</span>)
                      : <span className="text-[#A1A1AA]">—</span>
                    }
                  </td>
                  <td className="px-4 py-3.5 tabular-nums">
                    {e
                      ? <span className="font-semibold text-[#C2410C]">{e.units_used}</span>
                      : <span className="text-[#A1A1AA]">—</span>
                    }
                  </td>

                  {/* Water */}
                  <td className="px-4 py-3.5 tabular-nums text-[#3F3F46]">
                    {wPrevVal != null ? wPrevVal : <span className="text-[#A1A1AA]">—</span>}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-[#3F3F46]">
                    {wCurrVal != null
                      ? (w ? wCurrVal : <span className="italic text-[#2563EB]">{wCurrVal}?</span>)
                      : <span className="text-[#A1A1AA]">—</span>
                    }
                  </td>
                  <td className="px-4 py-3.5 tabular-nums">
                    {w
                      ? <span className="font-semibold text-[#3b82f6]">{w.units_used}</span>
                      : <span className="text-[#A1A1AA]">—</span>
                    }
                  </td>

                  {/* Actions: badge + delete button */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      {/* Badge */}
                      <div>
                        {hasReading ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            method === 'ocr'
                              ? 'bg-[#EEF4FF] text-[#2563EB]'
                              : 'bg-[#FFE8D1] text-[#71717A]'
                          }`}>
                            {method === 'ocr' ? 'OCR' : 'Manual'}
                          </span>
                        ) : hasDraft ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF3C7] text-[#B45309]">
                            รอตรวจสอบ (OCR)
                          </span>
                        ) : hasPrev ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fee2e2] text-[#dc2626]">
                            ยังไม่บันทึก
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F4F4F5] text-[#71717A]">
                            ไม่มีข้อมูล
                          </span>
                        )}
                      </div>

                      {/* Delete button — only for rows with readings, visible on hover */}
                      {hasReading && (
                        <button
                          onClick={e => handleDelete(e, room)}
                          disabled={isDeleting}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#71717A] hover:text-[#dc2626] hover:bg-[#fee2e2] transition-all disabled:opacity-40"
                          title="ลบข้อมูลมิเตอร์เดือนนี้"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}