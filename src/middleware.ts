import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = !!getSessionCookie(request)
  const isAuthRoute = AUTH_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  )

  if (!hasSession && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|logo.svg).*)",
  ],
}
