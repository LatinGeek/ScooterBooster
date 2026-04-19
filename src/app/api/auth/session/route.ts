import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { createSessionCookie, SESSION_COOKIE_NAME } from "@/lib/session"
import { ok, fail, withErrorHandling } from "@/lib/api-response"
import { enforceIpRateLimit } from "@/lib/ratelimit"
import { assertTrustedOrigin } from "@/lib/security"

const bodySchema = z.object({
  idToken: z.string().min(1),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)
  await enforceIpRateLimit("authIp", req)
  const secureCookies = req.nextUrl.protocol === "https:"

  const body = (await req.json()) as unknown
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return fail("Token inválido", 400)
  }

  const sessionCookie = await createSessionCookie(parsed.data.idToken)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    maxAge: 14 * 24 * 60 * 60, // 14 days in seconds
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
  })

  // Decode the ID token to extract the role claim for the optimistic proxy check.
  // This cookie is NOT httpOnly so the proxy can read it from req.cookies.
  const { adminAuth } = await import("@/lib/firebase-admin")
  const decoded = await adminAuth.verifyIdToken(parsed.data.idToken)
  const role = (decoded["role"] as string | undefined) ?? "user"
  cookieStore.set("__role", role, {
    maxAge: 14 * 24 * 60 * 60,
    httpOnly: false,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
  })

  return ok({ message: "Sesión iniciada" })
})
