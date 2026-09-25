import type { createClient } from '@/lib/supabase/server'

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>

export interface ExecutorCtx {
  origin: string
  supabase: ServerSupabase
  // Forwarded to internalFetch so the target /api/admin/* route's own admin check
  // (reading cookies via createClient()) sees the same session as this request —
  // internal fetches are a fresh HTTP request and don't inherit cookies otherwise.
  cookie: string
  // When true, runTool() in lib/agent/loop.ts short-circuits every 'write' tool
  // before its executor runs — no executor here ever needs to check this itself.
  sandbox: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolArgs = Record<string, any>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExecutorFn = (args: ToolArgs, ctx: ExecutorCtx) => Promise<any>

export async function resolveRoomId(
  supabase: ServerSupabase,
  args: { room_id?: string; room_number?: string }
): Promise<string> {
  if (args.room_id) return args.room_id
  if (!args.room_number) throw new Error('ต้องระบุ room_id หรือ room_number')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('rooms')
    .select('id')
    .eq('room_number', args.room_number)
    .single()
  if (error || !data) throw new Error(`ไม่พบห้อง "${args.room_number}"`)
  return data.id
}

export async function internalFetch(origin: string, path: string, cookie: string, init?: RequestInit) {
  const res = await fetch(new URL(path, origin), {
    ...init,
    headers: { 'Content-Type': 'application/json', Cookie: cookie, ...(init?.headers ?? {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  return body
}
