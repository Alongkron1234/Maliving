import { NextRequest, NextResponse } from 'next/server'
import { createProxyClient } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createProxyClient(request, response)

  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as string | undefined

  const { pathname } = request.nextUrl

  const isAdminRoute = pathname.startsWith('/admin')
  const isTenantRoute = pathname.startsWith('/tenant')
  const isLoginPage = pathname === '/login'

  // ไม่ได้ login แต่พยายามเข้า protected route
  if (!user && (isAdminRoute || isTenantRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // login แล้วแต่เข้าหน้า login → redirect ตาม role
  if (user && isLoginPage) {
    const dest = role === 'admin' ? '/admin' : '/tenant'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // tenant พยายามเข้า /admin
  if (user && role === 'tenant' && isAdminRoute) {
    return NextResponse.redirect(new URL('/tenant', request.url))
  }

  // admin พยายามเข้า /tenant
  if (user && role === 'admin' && isTenantRoute) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
