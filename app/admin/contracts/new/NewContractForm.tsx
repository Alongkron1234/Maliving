'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { addMonths } from '@/lib/contracts'

export type TenantOption = { id: string; name: string; roomNumber: string; rentPrice: number }

const inputClass =
  'w-full h-[42px] px-3.5 bg-[#FFFAF7] border border-[#E4E4E7] rounded-lg text-sm text-[#18181B] ' +
  'outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 transition-all placeholder:text-[#A1A1AA]'

function todayString() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function NewContractForm({ tenants }: { tenants: TenantOption[] }) {
  const router = useRouter()
  const [tenantId, setTenantId] = useState('')
  const [startDate, setStartDate] = useState(todayString())
  const [endDate, setEndDate] = useState(addMonths(todayString(), 12))
  const [rent, setRent] = useState('')
  const [deposit, setDeposit] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTenantChange(id: string) {
    setTenantId(id)
    // Pre-fill the rent from the room's listed price — the admin can still change it
    const t = tenants.find(x => x.id === id)
    if (t) setRent(String(t.rentPrice))
  }

  function handleStartChange(value: string) {
    setStartDate(value)
    if (value) setEndDate(addMonths(value, 12))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/admin/create-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        start_date: startDate,
        end_date: endDate,
        rent_amount: Number(rent),
        deposit_amount: deposit === '' ? 0 : Number(deposit),
      }),
    })
    const body = await res.json()

    if (!res.ok) {
      setError(body.error ?? 'เกิดข้อผิดพลาด')
      setLoading(false)
      return
    }

    router.push('/admin/contracts')
    router.refresh()
  }

  if (tenants.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#E4E4E7] p-14 text-center">
        <p className="text-sm font-semibold text-[#3F3F46]">ไม่มีผู้เช่าที่สร้างสัญญาได้</p>
        <p className="text-sm text-[#71717A] mt-1">ผู้เช่าที่ยังพักอยู่ทุกคนมีสัญญาที่มีผลอยู่แล้ว หรือยังไม่มีผู้เช่าในระบบ</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl border border-black/5 p-7 shadow-[0_1px_2px_rgba(36,25,18,0.04),0_8px_24px_rgba(36,25,18,0.04)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
          <div className="sm:col-span-2">
            <Label>ผู้เช่า</Label>
            <select required value={tenantId} onChange={e => handleTenantChange(e.target.value)} className={inputClass}>
              <option value="">เลือกผู้เช่า…</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  ห้อง {t.roomNumber} · {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>วันเริ่มสัญญา</Label>
            <input type="date" required value={startDate} onChange={e => handleStartChange(e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label>วันสิ้นสุดสัญญา</Label>
            <input type="date" required value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
          </div>

          <div>
            <Label>ค่าเช่า (บาท/เดือน)</Label>
            <input type="number" required min={0} step={1} value={rent} onChange={e => setRent(e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label>เงินมัดจำ (บาท)</Label>
            <input type="number" min={0} step={1} value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="0" className={inputClass} />
          </div>
        </div>

        {error && <p className="text-sm text-[#DC2626] bg-[#fee2e2] px-4 py-2.5 rounded-lg mt-6">{error}</p>}
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <Link
          href="/admin/contracts"
          className="px-6 py-2.5 bg-white border border-[#E4E4E7] text-[#3F3F46] text-sm font-semibold rounded-lg hover:border-[#C2410C] hover:text-[#C2410C] transition-colors"
        >
          ยกเลิก
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-lg shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {loading ? 'กำลังบันทึก…' : 'สร้างสัญญา'}
        </button>
      </div>
    </form>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-[#18181B] mb-2">{children}</label>
}
