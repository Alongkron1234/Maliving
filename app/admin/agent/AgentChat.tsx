'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Paperclip, X, Loader2, AlertTriangle, Bot } from 'lucide-react'

type Role = 'system' | 'user' | 'assistant' | 'tool'
interface ToolCall { id: string; type: 'function'; function: { name: string; arguments: string } }
interface AgentMessage { role: Role; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string; name?: string }
interface PendingToolCall { id: string; name: string; arguments: Record<string, unknown> }

const TOOL_LABELS: Record<string, string> = {
  save_meter_reading: 'บันทึกเลขมิเตอร์',
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

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
        body: JSON.stringify({ messages: msgs }),
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
        body: JSON.stringify({ messages, decisions }),
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
    <div className="h-full flex flex-col bg-white rounded-2xl border border-[#ddc1ae] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {visibleMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#897362]">
            <Bot size={32} className="mb-3 text-[#ff8c00]" />
            <p className="text-sm">ลองพิมพ์ เช่น &quot;สรุปภาพรวมหอพักตอนนี้&quot; หรือ &quot;ห้องไหนบิลค้างชำระบ้าง&quot;</p>
          </div>
        )}
        {visibleMessages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-[#ff8c00] text-white' : 'bg-[#fff1e9] text-[#241912]'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#fff1e9] rounded-2xl px-4 py-2.5 text-sm text-[#897362] flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              กำลังคิด…
            </div>
          </div>
        )}
        {error && <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {pending && pending.length > 0 && (
        <div className="border-t border-[#ddc1ae] bg-[#fff8f5] p-4 space-y-3 max-h-[45%] overflow-y-auto">
          <p className="text-xs font-semibold text-[#904d00] uppercase tracking-wide">รอการยืนยันก่อนบันทึกจริง</p>
          {pending.map(pc => (
            <ConfirmCard
              key={pc.id}
              call={pc}
              args={editedArgs[pc.id] ?? pc.arguments}
              onChange={(key, value) =>
                setEditedArgs(prev => ({ ...prev, [pc.id]: { ...prev[pc.id], [key]: value } }))
              }
            />
          ))}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancelAll}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-[#ddc1ae] text-[#564334] hover:border-[#904d00] hover:text-[#904d00] transition-colors disabled:opacity-60"
            >
              ยกเลิกทั้งหมด
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#ff8c00] hover:bg-[#904d00] text-white transition-colors disabled:opacity-60"
            >
              ยืนยันทั้งหมด
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-[#ddc1ae] p-4">
        {file && (
          <div className="mb-2 inline-flex items-center gap-2 bg-[#fff1e9] text-[#904d00] text-xs font-medium px-3 py-1.5 rounded-full">
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
            className="w-10 h-10 shrink-0 rounded-lg border border-[#ddc1ae] flex items-center justify-center text-[#897362] hover:border-[#904d00] hover:text-[#904d00] transition-colors disabled:opacity-50"
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
            className="flex-1 resize-none h-10 px-3.5 py-2.5 bg-[#fff8f5] border border-[#ddc1ae] rounded-lg text-sm text-[#241912] outline-none focus:border-[#ff8c00] focus:ring-2 focus:ring-[#ff8c00]/20 transition-all disabled:opacity-60"
          />
          <button
            onClick={handleSend}
            disabled={loading || !!pending || (!input.trim() && !file)}
            className="w-10 h-10 shrink-0 rounded-lg bg-[#ff8c00] hover:bg-[#904d00] text-white flex items-center justify-center transition-colors disabled:opacity-50"
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
  onChange,
}: {
  call: PendingToolCall
  args: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  const label = TOOL_LABELS[call.name] ?? call.name
  const dangerous = DANGEROUS_TOOLS.has(call.name)

  return (
    <div className={`bg-white rounded-xl border p-4 ${dangerous ? 'border-[#ffb4ab]' : 'border-[#ddc1ae]'}`}>
      <div className="flex items-center gap-2 mb-3">
        {dangerous && <AlertTriangle size={14} className="text-[#ba1a1a]" />}
        <p className={`text-sm font-bold ${dangerous ? 'text-[#ba1a1a]' : 'text-[#241912]'}`}>{label}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {Object.entries(args).map(([key, value]) => (
          <label key={key} className="text-xs">
            <span className="block text-[#897362] mb-1">{key}</span>
            <input
              value={value == null ? '' : String(value)}
              onChange={e => onChange(key, typeof value === 'number' ? Number(e.target.value) : e.target.value)}
              className="w-full h-8 px-2 bg-[#fff8f5] border border-[#ddc1ae] rounded-md text-xs text-[#241912] outline-none focus:border-[#ff8c00]"
            />
          </label>
        ))}
      </div>
    </div>
  )
}
