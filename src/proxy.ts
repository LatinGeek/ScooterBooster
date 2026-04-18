import { NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE_NAME } from "@/lib/session"

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/onboarding"]

// Routes that redirect authenticated users away (e.g. login)
const AUTH_ONLY_ROUTES = ["/login"]

// Role-restricted route prefixes
const ADMIN_ONLY_PREFIXES = ["/admin"]
const TECHNICIAN_ONLY_PREFIXES = ["/dashboard/technician"]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value
  const isAuthenticated = Boolean(sessionCookie)

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", req.nextUrl)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from /login to /
  const isAuthOnly = AUTH_ONLY_ROUTES.some((route) => pathname === route)
  if (isAuthOnly && isAuthenticated) {
    return NextResponse.redirect(new URL("/", req.nextUrl))
  }

  // Role-based protection — read role from a lightweight claim cookie (set after session exchange)
  // Note: for full security, role is re-verified in each API route and page via getSession()
  // Here we do optimistic redirect based on a non-httpOnly claim cookie
  const claimRole = req.cookies.get("__role")?.value as "user" | "technician" | "admin" | undefined

  if (claimRole) {
    const isAdminRoute = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))
    if (isAdminRoute && claimRole !== "admin") {
      return NextResponse.redirect(new URL("/", req.nextUrl))
    }

    const isTechRoute = TECHNICIAN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))
    if (isTechRoute && claimRole !== "technician" && claimRole !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
