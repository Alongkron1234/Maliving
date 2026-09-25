'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Paperclip, X, Loader2, AlertTriangle, Bot, FlaskConical } from 'lucide-react'

type Role = 'system' | 'user' | 'assistant' | 'tool'
interface ToolCall { id: string; type: 'function'; function: { name: string; arguments: string } }
interface AgentMessage { role: Role; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string; name?: string }
interface PendingToolCall { id: string; name: string; arguments: Record<string, unknown> }

const TOOL_LABELS: Record<string, string> = {
  save_meter_reading: 'บันทึกเลขมิเตอร์',
  save_meter_readings_bulk: 'บันทึกเลขมิเตอร์หลายห้องพร้อมกัน',
  generate_bill: 'ออกบิล',
  delete_bill: 'ลบบิล',
  record_payment: 'บันทึกการชำระเงิน',
  undo_payment: 'ยกเลิกการชำระเงิน',
  create_room: 'เพิ่มห้องใหม่',
  update_room: 'แก้ไขห้อง',
  delete_room: 'ลบห้อง (พร้อมข้อมูลที่เกี่ยวข้องทั้งหมด)',
  create_tenant: 'สร้างผู้เช่าใหม่',
  update_tenant: 'แก้ไขข้อมูลผู้เช่า',
  move_out_tenant: 'ให้ผู้เช่าย้ายออก',
  reset_tenant_password: 'ตั้งรหัสผ่านใหม่ให้ผู้เช่า',
  create_maintenance_request: 'สร้างรายการแจ้งซ่อม',
  update_maintenance_status: 'อัปเดตสถานะแจ้งซ่อม',
  delete_maintenance_request: 'ลบรายการแจ้งซ่อม',
  create_announcement: 'สร้างประกาศ (ผู้เช่าทุกคนจะเห็น)',
  update_announcement: 'แก้ไขประกาศ',
  delete_announcement: 'ลบประกาศ',
  toggle_pin_announcement: 'ปักหมุด/ยกเลิกปักหมุดประกาศ',
}

const DANGEROUS_TOOLS = new Set([
  'delete_room', 'delete_bill', 'delete_maintenance_request', 'delete_announcement',
  'reset_tenant_password', 'move_out_tenant',
])

export default function AgentChat() {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [pending, setPending] = useState<PendingToolCall[] | null>(null)
  const [input, setInput] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editedArgs, setEditedArgs] = useState<Record<string, Record<string, unknown>>>({})
  const [approved, setApproved] = useState<Record<string, boolean>>({})
  // Starts false to match the server-rendered markup exactly, then syncs from
  // localStorage in an effect (after hydration) — reading localStorage during
  // the initial render itself would make the client's first paint disagree
  // with the server's and trigger a hydration mismatch.
  const [sandbox, setSandbox] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setSandbox(localStorage.getItem('maliving_agent_sandbox') === '1')
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  function toggleSandbox() {
    setSandbox(prev => {
      const next = !prev
      localStorage.setItem('maliving_agent_sandbox', next ? '1' : '0')
      return next
    })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pending])

  function seedPendingState(pendingCalls: PendingToolCall[] | null) {
    if (!pendingCalls) {
      setEditedArgs({})
      setApproved({})
      return
    }
    const initArgs: Record<string, Record<string, unknown>> = {}
    const initApproved: Record<string, boolean> = {}
    for (const pc of pendingCalls) {
      initArgs[pc.id] = { ...pc.arguments }
      initApproved[pc.id] = true
    }
    setEditedArgs(initArgs)
    setApproved(initApproved)
  }

  async function sendToAgent(msgs: AgentMessage[]) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, sandbox }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'เกิดข้อผิดพลาด')
      setMessages(body.messages)
      setPending(body.pendingConfirmation)
      seedPendingState(body.pendingConfirmation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    if (!input.trim() && !file) return
    setError(null)

    let content = input.trim()
    if (file) {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/agent/upload', { method: 'POST', body: formData })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'อัปโหลดรูปไม่สำเร็จ')
        setLoading(false)
        return
      }
      content += `\n\n(ไฟล์แนบ: รูปมิเตอร์ image_path="${body.path}")`
    }

    const newMessages: AgentMessage[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setFile(null)
    await sendToAgent(newMessages)
  }

  async function submitDecisions(decisions: { id: string; approved: boolean; arguments?: Record<string, unknown> }[]) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/agent/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, decisions, sandbox }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'เกิดข้อผิดพลาด')
      setMessages(body.messages)
      setPending(body.pendingConfirmation)
      seedPendingState(body.pendingConfirmation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    if (!pending) return
    submitDecisions(pending.map(pc => ({
      id: pc.id,
      approved: approved[pc.id] ?? true,
      arguments: editedArgs[pc.id] ?? pc.arguments,
    })))
  }

  function handleCancelAll() {
    if (!pending) return
    submitDecisions(pending.map(pc => ({ id: pc.id, approved: false })))
  }

  const visibleMessages = messages.filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))

  return (
    <div className={`h-full flex flex-col bg-white rounded-2xl border overflow-hidden transition-colors ${sandbox ? 'border-[#7C3AED]' : 'border-[#E4E4E7]'}`}>
      {/* Sandbox toggle bar */}
      <div className={`flex items-center justify-between gap-3 px-4 py-2.5 border-b transition-colors ${sandbox ? 'bg-[#F5F3FF] border-[#DDD6FE]' : 'bg-[#FFFAF7] border-[#E4E4E7]'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical size={15} className={sandbox ? 'text-[#7C3AED]' : 'text-[#A1A1AA]'} />
          <div className="min-w-0">
            <p className={`text-xs font-semibold truncate ${sandbox ? 'text-[#6D28D9]' : 'text-[#3F3F46]'}`}>
              โหมดทดลอง (Sandbox)
            </p>
            <p className="text-[10px] text-[#71717A] truncate">
              {sandbox ? 'action ที่มีผลจริงจะถูกจำลอง ไม่บันทึกลงระบบจริง' : 'ทดสอบคำสั่งได้โดยไม่กระทบข้อมูลจริง'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleSandbox}
          disabled={loading || !!pending}
          role="switch"
          aria-checked={sandbox}
          className={`relative shrink-0 w-10 h-6 rounded-full transition-colors disabled:opacity-50 ${sandbox ? 'bg-[#7C3AED]' : 'bg-[#E4E4E7]'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${sandbox ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {visibleMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#71717A]">
            <Bot size={32} className="mb-3 text-[#FF6A00]" />
            <p className="text-sm">ลองพิมพ์ เช่น &quot;สรุปภาพรวมหอพักตอนนี้&quot; หรือ &quot;ห้องไหนบิลค้างชำระบ้าง&quot;</p>
          </div>
        )}
        {visibleMessages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-[#FF6A00] text-white' : 'bg-[#FFE8D1] text-[#18181B]'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#FFE8D1] rounded-2xl px-4 py-2.5 text-sm text-[#71717A] flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              กำลังคิด…
            </div>
          </div>
        )}
        {error && <p className="text-sm text-[#DC2626] bg-[#FEE2E2] px-4 py-2.5 rounded-lg">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {pending && pending.length > 0 && (
        <div className={`border-t p-4 space-y-3 max-h-[45%] overflow-y-auto ${sandbox ? 'bg-[#F5F3FF] border-[#DDD6FE]' : 'bg-[#FFFAF7] border-[#E4E4E7]'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide ${sandbox ? 'text-[#6D28D9]' : 'text-[#C2410C]'}`}>
            {sandbox ? 'รอยืนยัน (โหมดทดลอง — จะไม่บันทึกจริง)' : 'รอการยืนยันก่อนบันทึกจริง'}
          </p>
          {pending.map(pc => (
            <ConfirmCard
              key={pc.id}
              call={pc}
              args={editedArgs[pc.id] ?? pc.arguments}
              sandbox={sandbox}
              onChange={(key, value) =>
                setEditedArgs(prev => ({ ...prev, [pc.id]: { ...prev[pc.id], [key]: value } }))
              }
            />
          ))}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancelAll}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-[#E4E4E7] text-[#3F3F46] hover:border-[#C2410C] hover:text-[#C2410C] transition-colors disabled:opacity-60"
            >
              ยกเลิกทั้งหมด
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`px-5 py-2 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-60 ${
                sandbox ? 'bg-[#7C3AED] hover:bg-[#6D28D9]' : 'bg-[#FF6A00] hover:bg-[#C2410C]'
              }`}
            >
              {sandbox ? 'ยืนยัน (จำลอง)' : 'ยืนยันทั้งหมด'}
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-[#E4E4E7] p-4">
        {file && (
          <div className="mb-2 inline-flex items-center gap-2 bg-[#FFE8D1] text-[#C2410C] text-xs font-medium px-3 py-1.5 rounded-full">
            {file.name}
            <button onClick={() => setFile(null)}>
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || !!pending}
            title="แนบรูปมิเตอร์"
            className="w-10 h-10 shrink-0 rounded-lg border border-[#E4E4E7] flex items-center justify-center text-[#71717A] hover:border-[#C2410C] hover:text-[#C2410C] transition-colors disabled:opacity-50"
          >
            <Paperclip size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={loading || !!pending}
            rows={1}
            placeholder={pending ? 'ยืนยัน action ด้านบนก่อนคุยต่อ' : 'พิมพ์คำสั่ง เช่น ออกบิลทุกห้องเดือนนี้…'}
            className="flex-1 resize-none h-10 px-3.5 py-2.5 bg-[#FFFAF7] border border-[#E4E4E7] rounded-lg text-sm text-[#18181B] outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 transition-all disabled:opacity-60"
          />
          <button
            onClick={handleSend}
            disabled={loading || !!pending || (!input.trim() && !file)}
            className="w-10 h-10 shrink-0 rounded-lg bg-[#FF6A00] hover:bg-[#C2410C] text-white flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmCard({
  call,
  args,
  sandbox,
  onChange,
}: {
  call: PendingToolCall
  args: Record<string, unknown>
  sandbox: boolean
  onChange: (key: string, value: unknown) => void
}) {
  const label = TOOL_LABELS[call.name] ?? call.name
  const dangerous = DANGEROUS_TOOLS.has(call.name)

  // Bulk tools (currently just save_meter_readings_bulk) carry an array-of-objects
  // "readings" field — that renders as a small editable table instead of the flat
  // key/value grid every other tool's scalar args use.
  const readings = Array.isArray(args.readings) ? (args.readings as Record<string, unknown>[]) : null
  const scalarEntries = Object.entries(args).filter(([key]) => key !== 'readings')

  function updateReading(index: number, field: string, value: unknown) {
    if (!readings) return
    onChange('readings', readings.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  return (
    <div className={`bg-white rounded-xl border p-4 ${sandbox ? 'border-[#DDD6FE]' : dangerous ? 'border-[#FCA5A5]' : 'border-[#E4E4E7]'}`}>
      <div className="flex items-center gap-2 mb-3">
        {sandbox ? (
          <FlaskConical size={14} className="text-[#7C3AED]" />
        ) : dangerous ? (
          <AlertTriangle size={14} className="text-[#DC2626]" />
        ) : null}
        <p className={`text-sm font-bold ${sandbox ? 'text-[#6D28D9]' : dangerous ? 'text-[#DC2626]' : 'text-[#18181B]'}`}>
          {label}
          {sandbox && <span className="text-xs font-medium text-[#7C3AED]"> (จำลอง)</span>}
          {readings && <span className="text-xs font-medium text-[#71717A]"> · {readings.length} ห้อง</span>}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {scalarEntries.map(([key, value]) => (
          <label key={key} className="text-xs">
            <span className="block text-[#71717A] mb-1">{key}</span>
            <input
              value={value == null ? '' : String(value)}
              onChange={e => onChange(key, typeof value === 'number' ? Number(e.target.value) : e.target.value)}
              className="w-full h-8 px-2 bg-[#FFFAF7] border border-[#E4E4E7] rounded-md text-xs text-[#18181B] outline-none focus:border-[#FF6A00]"
            />
          </label>
        ))}
      </div>

      {readings && (
        <div className="mt-3 -mx-1 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#71717A]">
                <th className="text-left px-1 pb-1.5">ห้อง</th>
                <th className="text-left px-1 pb-1.5">⚡ ก่อน</th>
                <th className="text-left px-1 pb-1.5">⚡ หลัง</th>
                <th className="text-left px-1 pb-1.5">💧 ก่อน</th>
                <th className="text-left px-1 pb-1.5">💧 หลัง</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r, i) => (
                <tr key={i}>
                  <td className="px-1 py-0.5 font-semibold text-[#18181B] whitespace-nowrap">{String(r.room_number ?? '—')}</td>
                  {(['electric_previous', 'electric_current', 'water_previous', 'water_current'] as const).map(field => (
                    <td key={field} className="px-1 py-0.5">
                      <input
                        value={r[field] == null ? '' : String(r[field])}
                        onChange={e => updateReading(i, field, Number(e.target.value))}
                        className="w-16 h-7 px-1.5 bg-[#FFFAF7] border border-[#E4E4E7] rounded text-xs text-[#18181B] outline-none focus:border-[#FF6A00]"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
