import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAgentLoop, type AgentMessage } from '@/lib/agent/loop'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { messages } = (await req.json()) as { messages: AgentMessage[] }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Missing messages' }, { status: 400 })
  }

  const origin = new URL(req.url).origin

  try {
    const result = await runAgentLoop(messages, { origin, supabase })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
