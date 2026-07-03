import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Uploads a meter-photo attachment ahead of sending it to the agent chat, so the
// chat message can reference it by storage path for the run_meter_ocr tool.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const admin = createAdminClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `agent-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await admin.storage.from('meter-images').upload(path, buffer, { contentType: file.type || 'image/jpeg' })
  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ path })
}
