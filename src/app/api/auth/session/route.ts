import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { createSessionCookie, SESSION_COOKIE_NAME } from "@/lib/session"
import { ensureUserProfile } from "@/lib/db/users"
import { ok, fail, withErrorHandling } from "@/lib/api-response"
import { enforceIpRateLimit } from "@/lib/ratelimit"
import { assertTrustedOrigin } from "@/lib/security"

const bodySchema = z.object({
  idToken: z.string().min(1),
  phone: z
    .string()
    .regex(/^\+598\d{8}$/, "El teléfono debe tener formato +598XXXXXXXX")
    .optional(),
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

  const { adminAuth } = await import("@/lib/firebase-admin")
  const decoded = await adminAuth.verifyIdToken(parsed.data.idToken)
  const role = (decoded["role"] as string | undefined) ?? "user"

  await ensureUserProfile(decoded.uid, {
    displayName: typeof decoded.name === "string" ? decoded.name : "",
    email: typeof decoded.email === "string" ? decoded.email : "",
    photoURL: typeof decoded.picture === "string" ? decoded.picture : null,
    role: role === "admin" || role === "technician" ? role : "user",
    phone: parsed.data.phone,
  })

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
  cookieStore.set("__role", role, {
    maxAge: 14 * 24 * 60 * 60,
    httpOnly: false,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
  })

  return ok({ message: "Sesión iniciada" })
})
