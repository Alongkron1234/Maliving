'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Table, LayoutGrid, Zap } from 'lucide-react'
import type { Bill } from '@/lib/types/database'
import { billStatusConfig, getEffectiveBillStatus } from '@/lib/bills'

type RoomRow = { id: string; room_number: string; floor: number | null; rent_price: number }
type TenantInfo = { full_name: string }

export default function BillsTable({
  rooms,
  billByRoom,
  tenantByRoom,
  readingTypesByRoom,
  unitsByRoom,
  month,
  year,
}: {
  rooms: RoomRow[]
  billByRoom: Record<string, Bill>
  tenantByRoom: Record<string, TenantInfo>
  readingTypesByRoom: Record<string, Set<'electric' | 'water'>>
  unitsByRoom: Record<string, { electric?: number; water?: number }>
  month: number
  year: number
}) {
  const router = useRouter()
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [generatingRoomId, setGeneratingRoomId] = useState<string | null>(null)

  async function handleGenerateOne(e: React.MouseEvent, roomId: string) {
    e.stopPropagation()
    setGeneratingRoomId(roomId)

    const electric_rate = localStorage.getItem('maliving_electric_rate') ?? '8'
    const water_rate = localStorage.getItem('maliving_water_rate') ?? '18'

    const res = await fetch('/api/admin/generate-bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year, electric_rate, water_rate, room_id: roomId }),
    })
    const body = await res.json()

    setGeneratingRoomId(null)

    if (!res.ok) {
      window.alert(body.error ?? 'Something went wrong')
      return
    }
    if (body.errors?.length > 0) {
      window.alert(body.errors[0].reason)
      return
    }

    router.refresh()
  }

  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E4E4E7] p-12 shadow-[0_0_15px_rgba(144,77,0,0.06)] text-center">
        <p className="text-sm text-[#71717A]">ยังไม่มีห้องพัก</p>
      </div>
    )
  }

  return (
    <div>
      {/* View toggle */}
      <div className="flex justify-end mb-3">
        <div className="inline-flex rounded-lg border border-[#E4E4E7] bg-white p-0.5">
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              view === 'table' ? 'bg-[#FF6A00] text-white' : 'text-[#71717A] hover:text-[#3F3F46]'
            }`}
          >
            <Table size={13} />
            ตาราง
          </button>
          <button
            onClick={() => setView('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              view === 'cards' ? 'bg-[#FF6A00] text-white' : 'text-[#71717A] hover:text-[#3F3F46]'
            }`}
          >
            <LayoutGrid size={13} />
            รายละเอียด
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <div className="bg-white rounded-2xl border border-[#E4E4E7] shadow-[0_0_15px_rgba(144,77,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-[#FFFAF7] border-b border-[#E4E4E7]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">ห้อง</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">ผู้เช่า</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">ค่าเช่า</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">ค่าไฟ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">ค่าน้ำ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">รวม</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#71717A] uppercase tracking-wide">สถานะ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F4F5]">
                {rooms.map(room => {
                  const bill = billByRoom[room.id]
                  const tenant = tenantByRoom[room.id]
                  const readingTypes = readingTypesByRoom[room.id]
                  const hasMeterData = !!(readingTypes?.has('electric') && readingTypes?.has('water'))
                  const clickable = !!bill

                  return (
                    <tr
                      key={room.id}
                      onClick={() => clickable && router.push(`/admin/bills/${bill.id}`)}
                      className={`transition-colors ${clickable ? 'cursor-pointer hover:bg-[#FFFAF7]' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-[#18181B]">
                          Room {room.room_number}{room.floor != null ? ` (F${room.floor})` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[#3F3F46]">
                        {tenant?.full_name ?? <span className="text-[#A1A1AA]">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-[#3F3F46]">
                        {bill ? `฿${bill.rent_amount.toLocaleString('th-TH')}` : `฿${room.rent_price.toLocaleString('th-TH')}`}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-[#3F3F46]">
                        {bill ? `฿${bill.electric_amount.toLocaleString('th-TH')}` : <span className="text-[#A1A1AA]">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-[#3F3F46]">
                        {bill ? `฿${bill.water_amount.toLocaleString('th-TH')}` : <span className="text-[#A1A1AA]">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-bold text-[#18181B]">
                        {bill ? `฿${bill.total_amount.toLocaleString('th-TH')}` : <span className="text-[#A1A1AA] font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge bill={bill} hasTenant={!!tenant} hasMeterData={hasMeterData} />
                      </td>
                      <td className="px-4 py-3.5">
                        {!bill && tenant && hasMeterData && (
                          <button
                            onClick={e => handleGenerateOne(e, room.id)}
                            disabled={generatingRoomId === room.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FF6A00] hover:bg-[#C2410C] text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <Zap size={12} />
                            {generatingRoomId === room.id ? 'กำลังออก…' : 'ออกบิล'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => {
            const bill = billByRoom[room.id]
            const tenant = tenantByRoom[room.id]
            const readingTypes = readingTypesByRoom[room.id]
            const hasMeterData = !!(readingTypes?.has('electric') && readingTypes?.has('water'))
            const clickable = !!bill
            const units = unitsByRoom[room.id]

            return (
              <div
                key={room.id}
                onClick={() => clickable && router.push(`/admin/bills/${bill.id}`)}
                className={`bg-white rounded-2xl border border-[#E4E4E7] p-5 shadow-[0_0_15px_rgba(144,77,0,0.06)] transition-all ${
                  clickable ? 'cursor-pointer hover:shadow-[0_0_24px_rgba(144,77,0,0.12)] hover:-translate-y-0.5' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-[#18181B]">
                      Room {room.room_number}{room.floor != null ? ` (F${room.floor})` : ''}
                    </p>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      {tenant?.full_name ?? 'ไม่มีผู้เช่า'}
                    </p>
                  </div>
                  <StatusBadge bill={bill} hasTenant={!!tenant} hasMeterData={hasMeterData} />
                </div>

                {bill ? (
                  <div className="space-y-2 pt-3 border-t border-[#F4F4F5]">
                    <Row label="🏠 ค่าเช่า" value={`฿${bill.rent_amount.toLocaleString('th-TH')}`} />
                    <Row
                      label="⚡ ค่าไฟ"
                      sub={units?.electric != null ? `${units.electric.toLocaleString('th-TH')} หน่วย` : undefined}
                      value={`฿${bill.electric_amount.toLocaleString('th-TH')}`}
                    />
                    <Row
                      label="💧 ค่าน้ำ"
                      sub={units?.water != null ? `${units.water.toLocaleString('th-TH')} หน่วย` : undefined}
                      value={`฿${bill.water_amount.toLocaleString('th-TH')}`}
                    />
                    <div className="flex items-center justify-between pt-2 border-t border-[#F4F4F5]">
                      <span className="text-sm font-bold text-[#18181B]">รวม</span>
                      <span className="text-base font-bold text-[#FF6A00]">฿{bill.total_amount.toLocaleString('th-TH')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-[#F4F4F5] flex items-center justify-between gap-2">
                    <p className="text-xs text-[#A1A1AA]">ค่าเช่า ฿{room.rent_price.toLocaleString('th-TH')} — ยังไม่มีบิลเดือนนี้</p>
                    {tenant && hasMeterData && (
                      <button
                        onClick={e => handleGenerateOne(e, room.id)}
                        disabled={generatingRoomId === room.id}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FF6A00] hover:bg-[#C2410C] text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Zap size={12} />
                        {generatingRoomId === room.id ? 'กำลังออก…' : 'ออกบิล'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBadge({
  bill,
  hasTenant,
  hasMeterData,
}: {
  bill: Bill | undefined
  hasTenant: boolean
  hasMeterData: boolean
}) {
  if (bill) {
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${billStatusConfig[getEffectiveBillStatus(bill)].className}`}>
        {billStatusConfig[getEffectiveBillStatus(bill)].label}
      </span>
    )
  }
  if (!hasTenant) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 bg-[#F4F4F5] text-[#71717A]">
        ไม่มีผู้เช่า
      </span>
    )
  }
  if (!hasMeterData) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 bg-[#FEE2E2] text-[#B91C1C]">
        ข้อมูลมิเตอร์ไม่ครบ
      </span>
    )
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 bg-[#FEF3C7] text-[#B45309]">
      ยังไม่ออกบิล
    </span>
  )
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between text-sm text-[#3F3F46]">
      <span>
        {label}
        {sub && <span className="text-xs text-[#A1A1AA] ml-1.5">({sub})</span>}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
