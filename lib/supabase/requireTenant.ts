import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mirrors requireAdmin() — /api/tenant/* routes aren't covered by proxy.ts either
// (it only guards page routes starting with /admin or /tenant, not /api/*), so
// every route here must check auth itself before touching the service-role client.
export async function requireTenant() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'tenant') {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }), user: null }
  }
  return { error: null, user }
}
