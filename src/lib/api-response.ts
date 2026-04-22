import crypto from "crypto"
import { NextResponse } from "next/server"
import logger from "./logger"
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

function logAtLevel(level: "info" | "warn" | "error", payload: Record<string, unknown>, message: string) {
  const loggerFn = logger[level]
  if (typeof loggerFn === "function") {
    loggerFn.call(logger, payload, message)
  }
}

function attachRequestId<T>(
  response: NextResponse<ApiResponse<T>>,
  requestId: string | null,
): NextResponse<ApiResponse<T>> {
  if (requestId) {
    response.headers.set("x-request-id", requestId)
  }
  return response
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
  return async (...args: Args) => {
    const startedAt = Date.now()
    const maybeRequest = args[0]
    const isRequestLike =
      typeof maybeRequest === "object" &&
      maybeRequest !== null &&
      "method" in maybeRequest &&
      "nextUrl" in maybeRequest
    const req = isRequestLike
      ? (maybeRequest as { method: string; nextUrl: { pathname: string }; headers: Headers })
      : null
    const requestId = req?.headers.get("x-request-id") ?? crypto.randomUUID()

    try {
      const response = await handler(...args)
      if (req) {
        logAtLevel(
          "info",
          {
            route: req.nextUrl.pathname,
            method: req.method,
            status: response.status,
            requestId,
            durationMs: Date.now() - startedAt,
          },
          "API request completed"
        )
      }
      return attachRequestId(response, requestId)
    } catch (err: unknown) {
      if (isAppError(err)) {
        if (req) {
          logAtLevel(
            "warn",
            {
              route: req.nextUrl.pathname,
              method: req.method,
              status: err.statusCode,
              requestId,
              durationMs: Date.now() - startedAt,
              error: err.userMessage,
            },
            "API request failed with handled error"
          )
        }
        return attachRequestId(fail(err.userMessage, err.statusCode), requestId)
      }

      logAtLevel(
        "error",
        {
          route: req?.nextUrl.pathname,
          method: req?.method,
          requestId,
          durationMs: Date.now() - startedAt,
          err,
        },
        "Unhandled API error"
      )
      return attachRequestId(fail("Error interno del servidor.", 500), requestId)
    }
  }
}
