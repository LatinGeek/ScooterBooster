import { NextResponse } from "next/server"
import { isAppError } from "./errors"

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/** Return a successful JSON response */
export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

/** Return an error JSON response */
export function fail(message: string, status = 500): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
 * Wrap an async API route handler with consistent error handling.
 * Catches AppErrors and returns the correct status + Spanish user message.
 * Catches unknown errors and returns a generic 500.
 *
 * The handler can optionally accept a NextRequest argument. Callers pass it
 * via withErrorHandling(handler)(req) or withErrorHandling(handler)() for no-arg handlers.
 */
export function withErrorHandling<T, Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse<ApiResponse<T>>>
): (...args: Args) => Promise<NextResponse<ApiResponse<T | never>>> {
  return (...args: Args) =>
    handler(...args).catch((err: unknown) => {
      if (isAppError(err)) {
        return fail(err.userMessage, err.statusCode)
      }
      console.error("Unhandled API error:", err)
      return fail("Error interno del servidor.", 500)
    })
}
