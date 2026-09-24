import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAgentLoop, runTool, type AgentMessage } from '@/lib/agent/loop'

interface Decision {
  id: string
  approved: boolean
  arguments?: Record<string, unknown>
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { messages, decisions } = (await req.json()) as { messages: AgentMessage[]; decisions: Decision[] }
  if (!Array.isArray(messages) || messages.length === 0 || !Array.isArray(decisions)) {
    return NextResponse.json({ error: 'Missing messages or decisions' }, { status: 400 })
  }

  const lastMessage = messages[messages.length - 1]
  const pendingCalls = lastMessage?.tool_calls ?? []
  if (lastMessage?.role !== 'assistant' || pendingCalls.length === 0) {
    return NextResponse.json({ error: 'ไม่มี action ที่รอ confirm' }, { status: 400 })
  }

  const origin = new URL(req.url).origin
  const cookie = req.headers.get('cookie') ?? ''
  const ctx = { origin, supabase, cookie }

  const allRejected = pendingCalls.every(tc => !decisions.find(d => d.id === tc.id)?.approved)

  let updatedMessages: AgentMessage[] = [...messages]
  for (const tc of pendingCalls) {
    const decision = decisions.find(d => d.id === tc.id)
    const originalArgs = JSON.parse(tc.function.arguments || '{}')

    const result = decision?.approved
      ? await runTool(tc.function.name, decision.arguments ?? originalArgs, ctx)
      : { ok: false, error: 'ผู้ใช้ไม่ยืนยัน action นี้' }

    updatedMessages = [...updatedMessages, {
      role: 'tool',
      tool_call_id: tc.id,
      name: tc.function.name,
      content: JSON.stringify(result),
    }]
  }

  // A full cancel is a hard stop, not a suggestion — deciding this deterministically
  // here (instead of asking the model to "not retry") avoids the model immediately
  // re-proposing the exact same rejected tool call in its next turn.
  if (allRejected) {
    updatedMessages = [...updatedMessages, {
      role: 'assistant',
      content: 'ยกเลิกแล้วค่ะ ต้องการให้ช่วยอะไรต่อไหมคะ',
    }]
    return NextResponse.json({ messages: updatedMessages, pendingConfirmation: null })
  }

  try {
    const result = await runAgentLoop(updatedMessages, ctx)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
