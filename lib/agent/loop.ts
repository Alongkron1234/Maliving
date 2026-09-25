import Groq from 'groq-sdk'
import { toGroqTools, toolModeByName } from './tools'
import { executors } from './executors'
import type { ExecutorCtx } from './executors/types'

// llama-3.3-70b-versatile moved behind Groq's Enterprise tier ("Contact Sales" pricing) and
// now 404s with "does not exist or you do not have access to it" on a normal developer key.
// gpt-oss-120b is Groq's current publicly-priced production model with tool-calling support.
const MODEL = 'openai/gpt-oss-120b'
const MAX_ITERATIONS = 6

const SYSTEM_PROMPT = `คุณคือผู้ช่วย AI ของระบบจัดการหอพัก Maliving พูดภาษาไทย สุภาพ กระชับ ตรงประเด็น
- คุณเรียกใช้ฟังก์ชัน (tools) เพื่ออ่านหรือแก้ไขข้อมูลจริงในระบบแทนผู้ดูแลหอพัก (admin)
- action ที่มีผลจริงต่อข้อมูล (บันทึก/แก้ไข/ลบ) ระบบจะหยุดรอให้ admin กดยืนยันก่อนเสมอโดยอัตโนมัติ ไม่ต้องขอ permission ซ้ำในข้อความ แค่บอกสั้นๆว่ากำลังจะทำอะไร
- ถ้า action ต้องใช้ตัวเลขที่มาจาก OCR (เช่นค่ามิเตอร์) ให้บอกตัวเลขที่อ่านได้ให้ชัดเจนในข้อความ เพื่อให้ admin ตรวจสอบก่อนกดยืนยัน
- ถ้าข้อมูลไม่พอที่จะเรียก tool ได้ (เช่นไม่รู้ room_id) ให้เรียก tool ที่อ่านข้อมูลก่อน (list_rooms, list_tenants ฯลฯ) แทนที่จะถามผู้ใช้กลับทันที ถ้าหาไม่เจอจริงๆค่อยถาม
- ห้ามเรียก tool ที่เขียนข้อมูล (write) ทั้งที่ยัง "เดา" ค่า parameter ที่จำเป็นอยู่ (เช่น room_number, room_id) — ถ้าหลังเรียก tool อ่านข้อมูลแล้วยังไม่สามารถระบุได้ชัดเจนว่าเป็นห้องไหน/รายการไหน (เช่นผู้ใช้พิมพ์ "ห้องไหนก็ได้" หรือ "มั่วๆ" โดยไม่ระบุห้อง) ให้ถามกลับสั้นๆ ว่าต้องการห้อง/รายการไหน อย่าปฏิเสธคำขอเฉยๆ โดยไม่บอกเหตุผลหรือถามกลับ
- ถ้าเห็นผลลัพธ์ tool ที่บอกว่า "ผู้ใช้ไม่ยืนยัน action นี้" ห้ามเรียก tool เดิมซ้ำทันที ให้ตอบรับทราบสั้นๆ แล้วถามว่าต้องการให้ทำอะไรต่อแทน
- ตอบด้วยหน่วยเงินเป็นบาท (฿) และจำนวนหน่วยไฟ/น้ำอย่างชัดเจนเมื่อเกี่ยวข้อง
- วันนี้คือ ${new Date().toISOString().slice(0, 10)}`

const SANDBOX_NOTE = `

- ⚠️ ขณะนี้อยู่ใน "โหมดทดลอง (Sandbox)" — action ที่มีผลจริงต่อข้อมูล (write) ทุกตัวจะถูกจำลองเท่านั้น ไม่ได้บันทึกลงระบบจริงแต่อย่างใด แม้ admin จะกดยืนยันก็ตาม
- หลังเรียก tool ที่ผลลัพธ์มี "sandbox": true ให้บอกผู้ใช้ให้ชัดเจนว่านี่เป็นการจำลอง ("จำลองว่า...แล้วนะคะ ระบบจริงไม่ถูกแก้ไข") อย่าพูดราวกับว่าบันทึกจริงแล้ว
- tool ที่เป็น read (list_rooms, get_bill ฯลฯ) ยังคงดึงข้อมูลจริงตามปกติ — เฉพาะ write เท่านั้นที่ถูกจำลอง`

export interface AgentToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: AgentToolCall[]
  tool_call_id?: string
  name?: string
}

export interface PendingToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AgentLoopResult {
  messages: AgentMessage[]
  pendingConfirmation: PendingToolCall[] | null
}

// Rebuilds the system message every call (not just when missing) so toggling
// sandbox mode mid-conversation is reflected immediately, not just for new chats.
function ensureSystemPrompt(messages: AgentMessage[], sandbox: boolean): AgentMessage[] {
  const content = sandbox ? SYSTEM_PROMPT + SANDBOX_NOTE : SYSTEM_PROMPT
  if (messages.length > 0 && messages[0].role === 'system') {
    return [{ role: 'system', content }, ...messages.slice(1)]
  }
  return [{ role: 'system', content }, ...messages]
}

export async function runTool(name: string, args: Record<string, unknown>, ctx: ExecutorCtx) {
  const fn = executors[name]
  if (!fn) return { ok: false, error: `ไม่รู้จัก tool ชื่อ "${name}"` }

  // Sandbox mode: every 'write' tool is short-circuited here, before its executor
  // (whether it calls internalFetch or writes to ctx.supabase directly) ever runs —
  // one gate covers every write tool regardless of how it's implemented underneath.
  if (ctx.sandbox && toolModeByName[name] === 'write') {
    return {
      ok: true,
      data: {
        sandbox: true,
        note: 'จำลองการทำงานในโหมดทดลอง — ไม่ได้บันทึกจริงลงระบบ',
        tool: name,
        would_apply: args,
      },
    }
  }

  try {
    const data = await fn(args, ctx)
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function runAgentLoop(inputMessages: AgentMessage[], ctx: ExecutorCtx): Promise<AgentLoopResult> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  let messages = ensureSystemPrompt(inputMessages, ctx.sandbox)

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let completion
    try {
      completion = await groq.chat.completions.create({
        model: MODEL,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messages as any,
        tools: toGroqTools(),
        tool_choice: 'auto',
      })
    } catch (err) {
      // Groq's Llama models occasionally emit a malformed function call (esp. when
      // retrying right after a rejected tool call) and the API rejects it with a
      // 400 — degrade to a plain message instead of throwing, so a bad model
      // generation can never leave a confirmation card stuck open on the client.
      const message = err instanceof Error ? err.message : String(err)
      messages = [...messages, {
        role: 'assistant',
        content: `ขอโทษค่ะ ประมวลผลคำสั่งนี้ไม่สำเร็จ (${message.slice(0, 150)}) ลองพิมพ์คำสั่งใหม่อีกครั้งได้ไหมคะ`,
      }]
      return { messages, pendingConfirmation: null }
    }

    const assistantMessage = completion.choices[0].message
    const toolCalls = (assistantMessage.tool_calls ?? []) as AgentToolCall[]

    if (toolCalls.length === 0) {
      messages = [...messages, { role: 'assistant', content: assistantMessage.content ?? '' }]
      return { messages, pendingConfirmation: null }
    }

    messages = [...messages, { role: 'assistant', content: assistantMessage.content ?? null, tool_calls: toolCalls }]

    // If any call in this batch is a write action, pause the whole batch for
    // confirmation — simpler and safer than partially executing a mixed batch,
    // since every tool_call_id in this assistant message needs a matching tool
    // result before the conversation can continue either way.
    const hasWrite = toolCalls.some(tc => toolModeByName[tc.function.name] === 'write')
    if (hasWrite) {
      return {
        messages,
        pendingConfirmation: toolCalls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || '{}'),
        })),
      }
    }

    for (const tc of toolCalls) {
      const result = await runTool(tc.function.name, JSON.parse(tc.function.arguments || '{}'), ctx)
      messages = [...messages, { role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: JSON.stringify(result) }]
    }
  }

  messages = [...messages, {
    role: 'assistant',
    content: 'ขอโทษค่ะ คำขอนี้ต้องใช้หลายขั้นตอนเกินไป ลองแบ่งเป็นคำถามย่อยๆ หรือลองใหม่อีกครั้งได้ไหมคะ',
  }]
  return { messages, pendingConfirmation: null }
}
