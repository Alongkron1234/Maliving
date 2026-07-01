import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const reading_month = parseInt(formData.get('reading_month') as string)
  const reading_year = parseInt(formData.get('reading_year') as string)

  if (!file || !reading_month || !reading_year) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1. Upload image to Supabase Storage (admin client bypasses storage policies)
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from('meter-images')
    .upload(path, buffer, { contentType: file.type || 'image/jpeg' })

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  // 2. Create ocr_batches record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawBatch, error: batchError } = await (supabase as any)
    .from('ocr_batches')
    .insert({ image_url: path, status: 'pending', reading_month, reading_year })
    .select()
    .single()

  if (batchError || !rawBatch) {
    return NextResponse.json(
      { error: `Failed to create OCR batch record: ${batchError?.message ?? 'unknown error'}` },
      { status: 500 }
    )
  }
  const batch_id = rawBatch.id

  try {
    // 3. Call Groq Vision with the image as base64
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/jpeg'

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

    const prompt = `You are reading a Thai dormitory meter sheet photo.
Extract all room meter readings visible in the image and return ONLY valid JSON with no markdown fences, no explanation.
Required format: {"readings":[{"room":"101","electric":1234,"water":56},...]}
Rules:
- "room" must be the room number as a string
- "electric" is the electricity meter reading as an integer
- "water" is the water meter reading as an integer
- If a meter type is not visible for a room, omit that field
- Return only rooms you can clearly read`

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    })

    const text = (completion.choices[0]?.message?.content ?? '').trim()
    // Strip markdown fences in case the model wraps in a code block despite instructions
    const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const json = JSON.parse(jsonStr) as { readings: { room: string; electric?: number; water?: number }[] }

    // 4. Resolve room numbers to room ids now (not later) and validate against
    // rooms that actually exist. Storing room_id — not just the room_number string —
    // means a draft can never "reattach" to an unrelated new room that later reuses
    // the same room_number after the original room was deleted. This is only a
    // draft; nothing is written to meter_readings until the admin reviews and
    // hits "Save Reading" per room, so a bill can never be generated off an
    // unconfirmed OCR read.
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

    // 5. Save the extracted draft on the batch — admin confirms per room later
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('ocr_batches').update({
      status: 'done',
      raw_result: { readings },
      updated_at: new Date().toISOString(),
    }).eq('id', batch_id)

    return NextResponse.json({ batchId: batch_id, readings, errors })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('ocr_batches').update({
      status: 'failed',
      raw_result: { error: message },
      updated_at: new Date().toISOString(),
    }).eq('id', batch_id)
    return NextResponse.json({ error: `OCR failed: ${message}` }, { status: 500 })
  }
}
