import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest } from "next/server"
import { AppError } from "./errors"

const RATE_LIMIT_ERROR_MESSAGE = "Demasiadas solicitudes. Espera un momento e intenta de nuevo."

type PolicyName = "authIp" | "bookingUser" | "paymentUser" | "reviewUser"

type Policy = {
  limit: number
  windowMs: number
  windowLabel: `${number} ${"ms" | "s" | "m" | "h" | "d"}`
  prefix: string
}

type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

type LocalRateLimitEntry = {
  count: number
  resetAt: number
}

const policies: Record<PolicyName, Policy> = {
  authIp: {
    limit: 10,
    windowMs: 60_000,
    windowLabel: "60 s",
    prefix: "scooterbooster:auth",
  },
  bookingUser: {
    limit: 30,
    windowMs: 60_000,
    windowLabel: "60 s",
    prefix: "scooterbooster:bookings",
  },
  paymentUser: {
    limit: 10,
    windowMs: 60_000,
    windowLabel: "60 s",
    prefix: "scooterbooster:payments",
  },
  reviewUser: {
    limit: 10,
    windowMs: 86_400_000,
    windowLabel: "1 d",
    prefix: "scooterbooster:reviews",
  },
}

declare global {
  var __sbLocalRateLimitStore: Map<string, LocalRateLimitEntry> | undefined
  var __sbRateLimitClients: Partial<Record<PolicyName, Ratelimit>> | undefined
}

const localRateLimitStore = globalThis.__sbLocalRateLimitStore ?? new Map<string, LocalRateLimitEntry>()
globalThis.__sbLocalRateLimitStore = localRateLimitStore

const rateLimitClients = globalThis.__sbRateLimitClients ?? {}
globalThis.__sbRateLimitClients = rateLimitClients

function hasUpstashConfig(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

function getRatelimitClient(policyName: PolicyName): Ratelimit {
  const existing = rateLimitClients[policyName]
  if (existing) return existing

  const policy = policies[policyName]
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(policy.limit, policy.windowLabel),
    analytics: true,
    prefix: policy.prefix,
    timeout: 1000,
  })

  rateLimitClients[policyName] = ratelimit
  return ratelimit
}

function runLocalRateLimit(policyName: PolicyName, identifier: string): RateLimitResult {
  const policy = policies[policyName]
  const key = `${policyName}:${identifier}`
  const now = Date.now()
  const existing = localRateLimitStore.get(key)

  const entry =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + policy.windowMs,
        }

  entry.count += 1
  localRateLimitStore.set(key, entry)

  return {
    success: entry.count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - entry.count),
    reset: Math.ceil(entry.resetAt / 1000),
  }
}

async function runRateLimit(policyName: PolicyName, identifier: string): Promise<RateLimitResult> {
  if (hasUpstashConfig()) {
    const result = await getRatelimitClient(policyName).limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  }

  return runLocalRateLimit(policyName, identifier)
}

export function getRequestIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "127.0.0.1"
  }

  const realIp = req.headers.get("x-real-ip")
  if (realIp) {
    return realIp.trim()
  }

  return "127.0.0.1"
}

export async function enforceRateLimit(
  policyName: PolicyName,
  identifier: string
): Promise<RateLimitResult> {
  const result = await runRateLimit(policyName, identifier)

  if (!result.success) {
    throw new AppError(
      `Rate limit exceeded for ${policyName}:${identifier}`,
      RATE_LIMIT_ERROR_MESSAGE,
      429
    )
  }

  return result
}

export async function enforceIpRateLimit(
  policyName: Extract<PolicyName, "authIp">,
  req: NextRequest
): Promise<RateLimitResult> {
  return enforceRateLimit(policyName, getRequestIp(req))
}

export function resetLocalRateLimits(): void {
  localRateLimitStore.clear()
}
