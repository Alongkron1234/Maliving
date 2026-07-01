'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings2, Sparkles } from 'lucide-react'

type RoomOption = { id: string; room_number: string; floor: number | null; rent_price: number }
type ConfirmedEntry = { previous: number; current: number; input_method: 'manual' | 'ocr'; ocr_batch_id: string | null }
type FieldOrigin = 'confirmed' | 'draft' | 'manual'
type FieldState = { prev: string; curr: string; origin: FieldOrigin; inputMethod: 'manual' | 'ocr'; batchId: string | null }

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
]

function fieldFor(
  type: 'electric' | 'water',
  roomId: string,
  isDefaultPeriod: boolean,
  prevReadings: Record<string, { electric?: number; water?: number }>,
  confirmedByRoom: Record<string, { electric?: ConfirmedEntry; water?: ConfirmedEntry }>,
  ocrDraftByRoom: Record<string, { electric?: number; water?: number }>,
  ocrBatchId: string | null,
): FieldState {
  const historicalPrev = prevReadings[roomId]?.[type] ?? 0
  const confirmed = isDefaultPeriod ? confirmedByRoom[roomId]?.[type] : undefined
  if (confirmed) {
    return { prev: String(confirmed.previous), curr: String(confirmed.current), origin: 'confirmed', inputMethod: confirmed.input_method, batchId: confirmed.ocr_batch_id }
  }
  const draft = isDefaultPeriod ? ocrDraftByRoom[roomId]?.[type] : undefined
  if (draft != null) {
    return { prev: String(historicalPrev), curr: String(draft), origin: 'draft', inputMethod: 'ocr', batchId: ocrBatchId }
  }
  return { prev: String(historicalPrev), curr: '', origin: 'manual', inputMethod: 'manual', batchId: null }
}

export default function MeterManualForm({
  rooms,
  prevReadings,
  confirmedByRoom,
  ocrDraftByRoom,
  ocrBatchId,
  defaultMonth,
  defaultYear,
  initialRoomId,
}: {
  rooms: RoomOption[]
  prevReadings: Record<string, { electric?: number; water?: number }>
  confirmedByRoom: Record<string, { electric?: ConfirmedEntry; water?: ConfirmedEntry }>
  ocrDraftByRoom: Record<string, { electric?: number; water?: number }>
  ocrBatchId: string | null
  defaultMonth: number
  defaultYear: number
  initialRoomId?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startId = (initialRoomId && rooms.some(r => r.id === initialRoomId))
    ? initialRoomId
    : rooms[0]?.id ?? ''

  const [roomId, setRoomId] = useState(startId)
  const [month, setMonth] = useState(defaultMonth)
  const [year, setYear] = useState(defaultYear)

  const initElectric = fieldFor('electric', startId, true, prevReadings, confirmedByRoom, ocrDraftByRoom, ocrBatchId)
  const initWater = fieldFor('water', startId, true, prevReadings, confirmedByRoom, ocrDraftByRoom, ocrBatchId)

  const [eField, setEField] = useState<FieldState>(initElectric)
  const [wField, setWField] = useState<FieldState>(initWater)

  // Rates loaded from localStorage (set once on Meter list page)
  const [eRate, setERate] = useState(0)
  const [wRate, setWRate] = useState(0)

  useEffect(() => {
    const e = parseFloat(localStorage.getItem('maliving_electric_rate') ?? '0')
    const w = parseFloat(localStorage.getItem('maliving_water_rate') ?? '0')
    if (e > 0) setERate(e)
    if (w > 0) setWRate(w)
  }, [])

  // Re-derive prefill whenever room or period changes — confirmed/draft data only
  // applies to the exact month/year it was fetched for. Adjusted during render
  // (not an effect) per React's "adjusting state when a prop changes" pattern.
  const periodKey = `${roomId}|${month}|${year}`
  const [prevPeriodKey, setPrevPeriodKey] = useState(periodKey)
  if (periodKey !== prevPeriodKey) {
    setPrevPeriodKey(periodKey)
    const isDefaultPeriod = month === defaultMonth && year === defaultYear
    setEField(fieldFor('electric', roomId, isDefaultPeriod, prevReadings, confirmedByRoom, ocrDraftByRoom, ocrBatchId))
    setWField(fieldFor('water', roomId, isDefaultPeriod, prevReadings, confirmedByRoom, ocrDraftByRoom, ocrBatchId))
  }

  // ── Derived preview values ──────────────────────────────────────────────
  const ePrevInt = parseInt(eField.prev) || 0
  const wPrevInt = parseInt(wField.prev) || 0
  const eCurrInt = eField.curr !== '' ? parseInt(eField.curr) : NaN
  const wCurrInt = wField.curr !== '' ? parseInt(wField.curr) : NaN
  const eUnits   = !isNaN(eCurrInt) ? Math.max(0, eCurrInt - ePrevInt) : null
  const wUnits   = !isNaN(wCurrInt) ? Math.max(0, wCurrInt - wPrevInt) : null
  const eAmount  = eUnits != null && eRate > 0 ? Math.round(eUnits * eRate) : null
  const wAmount  = wUnits != null && wRate > 0 ? Math.round(wUnits * wRate) : null
  const selectedRoom = rooms.find(r => r.id === roomId)
  const rent     = selectedRoom?.rent_price ?? 0
  const hasRates = eRate > 0 && wRate > 0
  const hasAny   = eUnits != null || wUnits != null

  // Only show total row when both amounts are known
  const showTotal = eAmount != null && wAmount != null
  const total = (eAmount ?? 0) + (wAmount ?? 0) + rent

  const isEditingConfirmed = eField.origin === 'confirmed' || wField.origin === 'confirmed'

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (isNaN(eCurrInt) || isNaN(wCurrInt)) {
      setError('กรุณากรอกเลขมิเตอร์ให้ครบทั้งไฟฟ้าและน้ำ')
      return
    }
    if (eCurrInt < ePrevInt) {
      setError('เลขมิเตอร์ไฟฟ้าใหม่ต้องมากกว่าหรือเท่ากับเลขก่อน')
      return
    }
    if (wCurrInt < wPrevInt) {
      setError('เลขมิเตอร์น้ำใหม่ต้องมากกว่าหรือเท่ากับเลขก่อน')
      return
    }

    setLoading(true)
    const res = await fetch('/api/admin/meter-reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        reading_month: month,
        reading_year: year,
        electric_previous: ePrevInt,
        electric_current: eCurrInt,
        electric_input_method: eField.inputMethod,
        electric_ocr_batch_id: eField.batchId,
        water_previous: wPrevInt,
        water_current: wCurrInt,
        water_input_method: wField.inputMethod,
        water_ocr_batch_id: wField.batchId,
      }),
    })

    const body = await res.json()
    if (!res.ok) {
      setError(body.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    router.push(`/admin/meters?month=${month}&year=${year}`)
    router.refresh()
  }

  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#ddc1ae] p-12 shadow-[0_0_15px_rgba(144,77,0,0.06)] text-center">
        <p className="text-sm text-[#897362]">ไม่มีห้องที่มีผู้เช่า — เพิ่มผู้เช่าก่อน</p>
        <Link href="/admin/tenants/new" className="inline-block mt-4 text-sm font-semibold text-[#ff8c00] hover:text-[#904d00] transition-colors">
          เพิ่มผู้เช่า →
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ─── 2-column: form left | preview right ───────────────────────── */}
      <div className="grid grid-cols-[1fr_340px] gap-5 items-start">

        {/* ── LEFT: form card + buttons ── */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#ddc1ae] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
            <h2 className="text-base font-bold text-[#241912] mb-1">Meter Details</h2>
            <p className="text-sm text-[#897362] mb-7">
              {isEditingConfirmed
                ? 'ห้องนี้บันทึกมิเตอร์เดือนนี้ไว้แล้ว — แก้ไขแล้วกด Save Reading เพื่ออัปเดต'
                : 'Select a room and enter the current readings from the meter.'}
            </p>

            {/* Room + Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
              <Field label="Room">
                <select value={roomId} onChange={e => setRoomId(e.target.value)} className={inputClass}>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number}{r.floor != null ? ` (Floor ${r.floor})` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Month">
                <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className={inputClass}>
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Year">
                <input
                  type="number"
                  value={year}
                  onChange={e => setYear(parseInt(e.target.value))}
                  min={2020}
                  max={2099}
                  className={inputClass}
                />
              </Field>
            </div>

            <hr className="my-7 border-[#f0e0d4]" />

            {/* Electric */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">⚡</span>
                <h3 className="text-sm font-bold text-[#241912]">ไฟฟ้า (Electricity)</h3>
                {eField.origin === 'draft' && <OcrHint />}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <Field label="เลขมิเตอร์ก่อน">
                  <input type="number" value={eField.prev} onChange={e => setEField(f => ({ ...f, prev: e.target.value }))} min={0} className={inputClass} />
                </Field>
                <Field label="เลขมิเตอร์หลัง">
                  <input
                    type="number"
                    value={eField.curr}
                    onChange={e => setEField(f => ({ ...f, curr: e.target.value }))}
                    min={0}
                    placeholder="กรอกเลขมิเตอร์ใหม่"
                    required
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            {/* Water */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">💧</span>
                <h3 className="text-sm font-bold text-[#241912]">น้ำ (Water)</h3>
                {wField.origin === 'draft' && <OcrHint />}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <Field label="เลขมิเตอร์ก่อน">
                  <input type="number" value={wField.prev} onChange={e => setWField(f => ({ ...f, prev: e.target.value }))} min={0} className={inputClass} />
                </Field>
                <Field label="เลขมิเตอร์หลัง">
                  <input
                    type="number"
                    value={wField.curr}
                    onChange={e => setWField(f => ({ ...f, curr: e.target.value }))}
                    min={0}
                    placeholder="กรอกเลขมิเตอร์ใหม่"
                    required
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            {error && (
              <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg mt-6">{error}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <Link
              href="/admin/meters"
              className="px-6 py-2.5 bg-white border border-[#ddc1ae] text-[#564334] text-sm font-semibold rounded-lg hover:border-[#904d00] hover:text-[#904d00] transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#ff8c00] hover:bg-[#904d00] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving…' : 'Save Reading'}
            </button>
          </div>
        </div>

        {/* ── RIGHT: sticky preview ── */}
        <div className="sticky top-6">
          <div className="bg-white rounded-2xl border border-[#ddc1ae] p-6 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
            <h2 className="text-sm font-bold text-[#241912] mb-0.5">สรุปก่อนบันทึก</h2>
            <p className="text-xs text-[#897362] mb-5">
              Room {selectedRoom?.room_number} · {MONTHS[month - 1]?.label} {year}
            </p>

            {!hasAny ? (
              /* Placeholder */
              <div className="rounded-xl border border-dashed border-[#ddc1ae] px-4 py-8 text-center">
                <p className="text-xs text-[#c9a990]">กรอกเลขมิเตอร์หลัง</p>
                <p className="text-xs text-[#c9a990]">เพื่อดูสรุปที่นี่</p>
              </div>
            ) : (
              <>
                {/* Electric row */}
                <div className="rounded-xl bg-[#fff8f5] px-4 py-3.5 mb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[#897362]">⚡ ไฟฟ้า</span>
                    {eUnits != null && (
                      <span className="text-lg font-bold text-[#904d00]">{eUnits} หน่วย</span>
                    )}
                  </div>
                  {eUnits != null && (
                    <div className="text-xs text-[#564334]">
                      {ePrevInt} → {eCurrInt}
                    </div>
                  )}
                  {eAmount != null && (
                    <div className="text-xs text-[#904d00] mt-1 font-medium">
                      {eUnits} × ฿{eRate} = <span className="font-bold">฿{eAmount.toLocaleString('th-TH')}</span>
                    </div>
                  )}
                  {eUnits != null && eRate === 0 && (
                    <div className="text-xs text-[#c9a990] mt-1">— ยังไม่ได้ตั้งค่าอัตรา</div>
                  )}
                </div>

                {/* Water row */}
                <div className="rounded-xl bg-[#eff6ff] px-4 py-3.5 mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[#897362]">💧 น้ำ</span>
                    {wUnits != null && (
                      <span className="text-lg font-bold text-[#3b82f6]">{wUnits} หน่วย</span>
                    )}
                  </div>
                  {wUnits != null && (
                    <div className="text-xs text-[#564334]">
                      {wPrevInt} → {wCurrInt}
                    </div>
                  )}
                  {wAmount != null && (
                    <div className="text-xs text-[#3b82f6] mt-1 font-medium">
                      {wUnits} × ฿{wRate} = <span className="font-bold">฿{wAmount.toLocaleString('th-TH')}</span>
                    </div>
                  )}
                  {wUnits != null && wRate === 0 && (
                    <div className="text-xs text-[#c9a990] mt-1">— ยังไม่ได้ตั้งค่าอัตรา</div>
                  )}
                </div>

                {/* Total breakdown */}
                {showTotal ? (
                  <div className="space-y-2 border-t border-[#f0e0d4] pt-4">
                    <Row label={`⚡ ค่าไฟ`} value={`฿${eAmount!.toLocaleString('th-TH')}`} />
                    <Row label={`💧 ค่าน้ำ`} value={`฿${wAmount!.toLocaleString('th-TH')}`} />
                    <Row label="🏠 ค่าเช่า" value={`฿${rent.toLocaleString('th-TH')}`} />
                    <div className="flex items-center justify-between pt-2 border-t border-[#ddc1ae]">
                      <span className="text-sm font-bold text-[#241912]">รวม (ประมาณ)</span>
                      <span className="text-base font-bold text-[#ff8c00]">฿{total.toLocaleString('th-TH')}</span>
                    </div>
                    <p className="text-[10px] text-[#c9a990]">* ยอดจริงคำนวณตอนออกบิล</p>
                  </div>
                ) : (
                  /* Rates not set yet */
                  !hasRates && (
                    <Link
                      href="/admin/meters"
                      className="flex items-center gap-1.5 text-xs text-[#897362] hover:text-[#564334] transition-colors"
                    >
                      <Settings2 size={12} />
                      ตั้งค่าอัตราที่หน้า Meter Readings
                    </Link>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}

function OcrHint() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fff3cd] text-[#8a6100]">
      <Sparkles size={10} />
      จาก OCR — ตรวจสอบก่อนบันทึก
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#241912] mb-2">{label}</label>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm text-[#564334]">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

const inputClass =
  'w-full h-[42px] px-3.5 bg-[#fff8f5] border border-[#ddc1ae] rounded-lg text-sm text-[#241912] ' +
  'outline-none focus:border-[#ff8c00] focus:ring-2 focus:ring-[#ff8c00]/20 transition-all ' +
  'placeholder:text-[#c9a990]'
