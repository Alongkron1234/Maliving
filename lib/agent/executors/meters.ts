import Groq from 'groq-sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveRoomId, internalFetch, type ExecutorCtx, type ToolArgs } from './types'

type AdminClient = ReturnType<typeof createAdminClient>

const OCR_PROMPT = `You are reading a Thai dormitory meter sheet photo.
Extract all room meter readings visible in the image and return ONLY valid JSON with no markdown fences, no explanation.
Required format: {"readings":[{"room":"101","electric":1234,"water":56},...]}
Rules:
- "room" must be the room number as a string
- "electric" is the electricity meter reading as an integer
- "water" is the water meter reading as an integer
- If a meter type is not visible for a room, omit that field
- Return only rooms you can clearly read`

// Shared between the manual-upload OCR route and the agent's run_meter_ocr tool —
// both need the exact same "call Groq vision, resolve room_number -> room_id, save draft" steps.
export async function runOcrOnImage(supabase: AdminClient, imageBuffer: Buffer, mimeType: string, path: string, month: number, year: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawBatch, error: batchError } = await (supabase as any)
    .from('ocr_batches')
    .insert({ image_url: path, status: 'pending', reading_month: month, reading_year: year })
    .select()
    .single()

  if (batchError || !rawBatch) {
    throw new Error(`Failed to create OCR batch record: ${batchError?.message ?? 'unknown error'}`)
  }
  const batch_id = rawBatch.id

  try {
    const base64 = imageBuffer.toString('base64')
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OCR_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    })

    const text = (completion.choices[0]?.message?.content ?? '').trim()
    const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const json = JSON.parse(jsonStr) as { readings: { room: string; electric?: number; water?: number }[] }

    const { data: roomsRaw } = await supabase.from('rooms').select('id, room_number')
    const rooms = (roomsRaw ?? []) as { id: string; room_number: string }[]
    const roomIdByNumber = Object.fromEntries(rooms.map(r => [r.room_number, r.id]))

    const readings: { room: string; room_id: string; electric?: number; water?: number }[] = []
    const errors: { room: string; reason: string }[] = []

    for (const reading of json.readings) {
      const roomId = roomIdByNumber[reading.room]
      if (!roomId) {
        errors.push({ room: reading.room, reason: 'ไม่พบห้องนี้ในระบบ' })
        continue
      }
      readings.push({ ...reading, room_id: roomId })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('ocr_batches').update({
      status: 'done',
      raw_result: { readings },
      updated_at: new Date().toISOString(),
    }).eq('id', batch_id)

    return { batchId: batch_id, readings, errors }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('ocr_batches').update({
      status: 'failed',
      raw_result: { error: message },
      updated_at: new Date().toISOString(),
    }).eq('id', batch_id)
    throw new Error(`OCR failed: ${message}`)
  }
}

export async function get_meter_status(args: ToolArgs, ctx: ExecutorCtx) {
  const [{ data: rooms }, { data: readings }, { data: tenants }] = await Promise.all([
    ctx.supabase.from('rooms').select('id, room_number') as unknown as Promise<{ data: { id: string; room_number: string }[] | null }>,
    ctx.supabase.from('meter_readings').select('room_id, meter_type').eq('reading_month', args.month).eq('reading_year', args.year) as unknown as Promise<{ data: { room_id: string; meter_type: string }[] | null }>,
    ctx.supabase.from('tenants').select('room_id').eq('status', 'active') as unknown as Promise<{ data: { room_id: string }[] | null }>,
  ])

  const roomIdsWithTenant = new Set((tenants ?? []).map((t: { room_id: string }) => t.room_id))
  const typesByRoom: Record<string, Set<string>> = {}
  for (const r of readings ?? []) {
    if (!typesByRoom[r.room_id]) typesByRoom[r.room_id] = new Set()
    typesByRoom[r.room_id].add(r.meter_type)
  }

  return (rooms ?? []).map(r => {
    const types = typesByRoom[r.id]
    const hasElectric = types?.has('electric') ?? false
    const hasWater = types?.has('water') ?? false
    return {
      room_number: r.room_number,
      has_tenant: roomIdsWithTenant.has(r.id),
      has_electric_reading: hasElectric,
      has_water_reading: hasWater,
      ready_for_billing: roomIdsWithTenant.has(r.id) && hasElectric && hasWater,
    }
  })
}

export async function list_meter_readings(args: ToolArgs, ctx: ExecutorCtx) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (ctx.supabase as any)
    .from('meter_readings')
    .select('room_id, meter_type, reading_month, reading_year, previous_reading, current_reading, units_used, input_method, rooms(room_number)')
  if (args.month) query = query.eq('reading_month', args.month)
  if (args.year) query = query.eq('reading_year', args.year)
  if (args.room_number) {
    const room_id = await resolveRoomId(ctx.supabase, args)
    query = query.eq('room_id', room_id)
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function get_ocr_batch(args: ToolArgs, ctx: ExecutorCtx) {
  const { data, error } = await ctx.supabase.from('ocr_batches').select('*').eq('id', args.batch_id).single()
  if (error || !data) throw new Error('ไม่พบ OCR batch นี้')
  return data
}

export async function run_meter_ocr(args: ToolArgs) {
  const admin = createAdminClient()
  const { data: fileBlob, error: downloadError } = await admin.storage.from('meter-images').download(args.image_path)
  if (downloadError || !fileBlob) throw new Error(`โหลดรูปไม่สำเร็จ: ${downloadError?.message ?? 'ไม่พบไฟล์'}`)
  const buffer = Buffer.from(await fileBlob.arrayBuffer())
  return runOcrOnImage(admin, buffer, fileBlob.type || 'image/jpeg', args.image_path, args.month, args.year)
}

export async function save_meter_reading(args: ToolArgs, ctx: ExecutorCtx) {
  const room_id = await resolveRoomId(ctx.supabase, args)
  return internalFetch(ctx.origin, '/api/admin/meter-reading', {
    method: 'POST',
    body: JSON.stringify({
      room_id,
      reading_month: args.month,
      reading_year: args.year,
      electric_previous: args.electric_previous ?? 0,
      electric_current: args.electric_current,
      electric_input_method: args.input_method ?? 'manual',
      electric_ocr_batch_id: args.ocr_batch_id ?? null,
      water_previous: args.water_previous ?? 0,
      water_current: args.water_current,
      water_input_method: args.input_method ?? 'manual',
      water_ocr_batch_id: args.ocr_batch_id ?? null,
    }),
  })
}
