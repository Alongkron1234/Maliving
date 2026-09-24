import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// These routes use createAdminClient() (service role — bypasses RLS entirely), so unlike
// normal RLS-backed queries, an unauthenticated caller who guesses the URL would otherwise
// have full read/write access. Call this first in every /api/admin/* route.
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  return null
}
