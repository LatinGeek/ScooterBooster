import { cookies } from "next/headers"
import { adminAuth } from "@/lib/firebase-admin"
import type { DecodedIdToken } from "firebase-admin/auth"

export const SESSION_COOKIE_NAME = "__session"
const SESSION_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

/**
 * Create a Firebase session cookie from a client-side ID token.
 * Returns the signed cookie string.
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_COOKIE_MAX_AGE_MS,
  })
}

/**
 * Read and verify the session cookie from the request.
 * Returns the decoded token (with custom claims) or null.
 */
export async function getSession(): Promise<DecodedIdToken | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)
  if (!cookie?.value) return null

  try {
    return await adminAuth.verifySessionCookie(cookie.value, true)
  } catch {
    return null
  }
}

/**
 * Helper that returns the role from the session, or null if unauthenticated.
 */
export async function getSessionRole(): Promise<"user" | "technician" | "admin" | null> {
  const session = await getSession()
  if (!session) return null
  const role = session["role"] as "user" | "technician" | "admin" | undefined
  return role ?? "user"
}
