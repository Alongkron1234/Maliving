import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/requireAdmin'
import { NextResponse } from 'next/server'
import { runOcrOnImage } from '@/lib/agent/executors/meters'

export async function POST(req: Request) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

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

  // 2-5. Call Groq Vision, resolve room_number -> room_id (so a draft can never
  // "reattach" to an unrelated new room that later reuses the same room_number),
  // and save the extracted draft on the ocr_batches row — admin confirms per
  // room later via "Save Reading", nothing is written to meter_readings here.
  try {
    const result = await runOcrOnImage(supabase, buffer, file.type || 'image/jpeg', path, reading_month, reading_year)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
