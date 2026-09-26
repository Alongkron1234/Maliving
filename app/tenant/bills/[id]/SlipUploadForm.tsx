'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'

export default function SlipUploadForm({ billId }: { billId: string }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('กรุณาเลือกรูปสลิปก่อน')
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bill_id', billId)

    const res = await fetch('/api/tenant/upload-slip', { method: 'POST', body: formData })
    const body = await res.json()

    if (!res.ok) {
      setError(body.error ?? 'อัปโหลดไม่สำเร็จ')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label
        htmlFor="slip"
        className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#E4E4E7] rounded-xl p-6 cursor-pointer hover:border-[#FF6A00] transition-colors"
      >
        <Upload size={22} className="text-[#71717A]" />
        <span className="text-sm font-semibold text-[#3F3F46]">
          {file ? file.name : 'แตะเพื่อเลือกรูปสลิป'}
        </span>
        <span className="text-xs text-[#A1A1AA]">รองรับไฟล์รูปภาพ ขนาดไม่เกิน 5MB</span>
        <input
          id="slip"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {error && <p className="text-sm text-[#DC2626] bg-[#fee2e2] px-3 py-2 rounded-lg">{error}</p>}

      <button
        type="submit"
        disabled={loading || !file}
        className="w-full py-2.5 bg-[#FF6A00] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-lg
                   shadow-sm shadow-[#FF6A00]/30 transition-all hover:shadow-md hover:-translate-y-0.5
                   disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {loading ? 'กำลังส่งสลิป…' : 'แจ้งชำระเงิน'}
      </button>
    </form>
  )
}
