import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)
    const role = user?.app_metadata?.role as string | undefined
    const dest = role === 'admin' ? '/admin' : '/tenant'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return NextResponse.redirect(new URL('/login', request.url))
}
