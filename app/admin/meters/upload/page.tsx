'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Camera, Upload, CheckCircle, AlertCircle } from 'lucide-react'

type ExtractedReading = { room: string; electric?: number; water?: number }
type ReadingError = { room: string; reason: string }

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const inputClass =
  'w-full h-[42px] px-3.5 bg-[#FFFAF7] border border-[#E4E4E7] rounded-lg text-sm text-[#18181B] ' +
  'outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 transition-all ' +
  'placeholder:text-[#A1A1AA]'

export default function MeterUploadPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ readings: ExtractedReading[]; errors: ReadingError[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) return

    setError(null)
    setResult(null)
    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('reading_month', String(month))
    formData.append('reading_year', String(year))

    const res = await fetch('/api/admin/ocr', {
      method: 'POST',
      body: formData,
    })

    const body = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(body.error ?? 'Something went wrong')
      return
    }

    setResult(body)
  }

  return (
    <div className="p-8">
      <Link
        href="/admin/meters"
        className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#3F3F46] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Back to Meter Readings
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#18181B]">OCR Upload</h1>
        <p className="text-sm text-[#71717A] mt-1">
          Upload a photo of the meter sheet — AI will extract all room readings automatically.
        </p>
      </div>

      <div className="max-w-2xl space-y-5">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl border border-[#E4E4E7] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
            <h2 className="text-base font-bold text-[#18181B] mb-1">Upload Meter Sheet</h2>
            <p className="text-sm text-[#71717A] mb-7">
              Select the billing month and upload a clear photo of the handwritten meter sheet.
            </p>

            {/* Month + Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6 mb-7">
              <div>
                <label className="block text-sm font-semibold text-[#18181B] mb-2">Month</label>
                <select
                  value={month}
                  onChange={e => setMonth(parseInt(e.target.value))}
                  className={inputClass}
                >
                  {MONTHS.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#18181B] mb-2">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={e => setYear(parseInt(e.target.value))}
                  min={2020}
                  max={2099}
                  className={inputClass}
                />
              </div>
            </div>

            {/* File Drop Zone */}
            <div>
              <label className="block text-sm font-semibold text-[#18181B] mb-2">Meter Sheet Photo</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  file
                    ? 'border-[#FF6A00] bg-[#FFFAF7]'
                    : 'border-[#E4E4E7] hover:border-[#FF6A00] hover:bg-[#FFFAF7]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
                <Camera
                  size={32}
                  className={`mx-auto mb-3 ${file ? 'text-[#FF6A00]' : 'text-[#71717A]'}`}
                />
                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-[#18181B]">{file.name}</p>
                    <p className="text-xs text-[#71717A] mt-1">
                      {(file.size / 1024 / 1024).toFixed(1)} MB — คลิกเพื่อเลือกใหม่
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-[#3F3F46]">คลิกเพื่อเลือกรูปภาพ</p>
                    <p className="text-xs text-[#71717A] mt-1">JPG, PNG, HEIC รองรับ</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-[#DC2626] bg-[#FEE2E2] px-4 py-2.5 rounded-lg mt-6">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <Link
              href="/admin/meters"
              className="px-6 py-2.5 bg-white border border-[#E4E4E7] text-[#3F3F46] text-sm font-semibold rounded-lg hover:border-[#C2410C] hover:text-[#C2410C] transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !file}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Upload size={15} />
              {loading ? 'กำลังวิเคราะห์รูป…' : 'อัปโหลดและประมวลผล'}
            </button>
          </div>
        </form>

        {/* Result Panel */}
        {result && (
          <div className="bg-white rounded-2xl border border-[#E4E4E7] p-7 shadow-[0_0_15px_rgba(144,77,0,0.06)]">
            <h2 className="text-base font-bold text-[#18181B] mb-1">ผลการประมวลผล</h2>
            <p className="text-sm text-[#71717A] mb-5">
              อ่านค่าได้ {result.readings.length} ห้อง — ยังไม่บันทึกลงระบบ
              {result.errors.length > 0 && ` · ข้อผิดพลาด ${result.errors.length} ห้อง`}
            </p>
            <p className="text-xs text-[#A1A1AA] mb-5 -mt-4">
              เปิดแต่ละห้องเพื่อตรวจสอบเลขมิเตอร์แล้วกด &quot;Save Reading&quot; เพื่อยืนยัน
            </p>

            {result.readings.length > 0 && (
              <div className="space-y-2 mb-4">
                {result.readings.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-[#f0fdf4] border border-[#86efac] rounded-lg px-4 py-2.5"
                  >
                    <CheckCircle size={15} className="text-[#16a34a] shrink-0" />
                    <span className="text-sm font-medium text-[#15803d]">
                      Room {r.room}
                      {r.electric != null && <span className="ml-2 font-normal">⚡ {r.electric}</span>}
                      {r.water != null && <span className="ml-2 font-normal">💧 {r.water}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-2 mb-5">
                {result.errors.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-[#FEE2E2] rounded-lg px-4 py-2.5"
                  >
                    <AlertCircle size={15} className="text-[#B91C1C] shrink-0" />
                    <span className="text-sm font-medium text-[#B91C1C]">
                      Room {err.room}: {err.reason}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Link
              href={`/admin/meters?month=${month}&year=${year}`}
              className="inline-flex items-center gap-2 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              ดูมิเตอร์เดือนนี้ →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}