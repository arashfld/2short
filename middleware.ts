import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname === '/@vite/client') {
    return new Response('', { status: 204 })
  }

  // Only guard dashboard routes server-side
  const isDashboard = pathname.startsWith('/dashboard')
  if (!isDashboard) {
    return NextResponse.next()
  }

  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session || !session.user) {
    const loginUrl = new URL('/', req.url)
    loginUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  // Run middleware for all paths; we will only guard dashboard
  // and handle special cases like '/@vite/client' inside.
  matcher: ['/:path*']
}