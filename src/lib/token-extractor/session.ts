import { cookies } from "next/headers"
import type { NextResponse } from "next/server"
import type { ApiResponse } from "@/lib/api-response"
import { decryptJson, encryptJson } from "./crypto"
import type { ChallengeResult, PendingState, XiaomiSession } from "./client"

export const XIAOMI_SESSION_COOKIE = "sb_xiaomi_session"
export const XIAOMI_PENDING_COOKIE = "sb_xiaomi_pending"
const SESSION_MAX_AGE = 2 * 60 * 60
const PENDING_MAX_AGE = 10 * 60

function cookieOptions(maxAge: number) {
  return {
    maxAge,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  }
}

export async function readXiaomiSession(): Promise<XiaomiSession | null> {
  const store = await cookies()
  return decryptJson<XiaomiSession>(store.get(XIAOMI_SESSION_COOKIE)?.value)
}

export async function readPending(): Promise<PendingState | null> {
  const store = await cookies()
  return decryptJson<PendingState>(store.get(XIAOMI_PENDING_COOKIE)?.value)
}

export function writeXiaomiSession(response: NextResponse, session: XiaomiSession): void {
  response.cookies.set(XIAOMI_SESSION_COOKIE, encryptJson(session), cookieOptions(SESSION_MAX_AGE))
  response.cookies.delete(XIAOMI_PENDING_COOKIE)
}

export function writePending(response: NextResponse, pending: PendingState): void {
  response.cookies.set(XIAOMI_PENDING_COOKIE, encryptJson(pending), cookieOptions(PENDING_MAX_AGE))
}

export function clearXiaomiSession(response: NextResponse): void {
  response.cookies.delete(XIAOMI_SESSION_COOKIE)
  response.cookies.delete(XIAOMI_PENDING_COOKIE)
}

export function clearPending(response: NextResponse): void {
  response.cookies.delete(XIAOMI_PENDING_COOKIE)
}

export function applyLoginResult<T>(
  response: NextResponse<ApiResponse<T>>,
  result: ChallengeResult
): NextResponse<ApiResponse<T>> {
  if (result.status === "ok") {
    writeXiaomiSession(response, result.session)
    return response
  }
  writePending(response, result.pending)
  return response
}

export function challengePayload(result: ChallengeResult): Record<string, unknown> {
  if (result.status === "ok") {
    return { status: "ok", authenticated: true, userId: result.session.userId }
  }
  return {
    status: "challenge",
    type: result.kind,
    ...result.data,
  }
}
