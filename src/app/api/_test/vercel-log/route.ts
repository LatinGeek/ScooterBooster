import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const SEARCH_MARKER = "scooterbooster_axiom_vercel_test"

function isCronAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get("authorization") === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  const onVercel = process.env.VERCEL === "1"

  if (onVercel) {
    if (!process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: "CRON_SECRET is not set on this deployment." },
        { status: 503 },
      )
    }
    if (!isCronAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  const payload = {
    event: SEARCH_MARKER,
    timestamp: new Date().toISOString(),
    ...(onVercel && {
      vercel: {
        region: process.env.VERCEL_REGION,
        deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
      },
    }),
  }

  console.log(JSON.stringify(payload))

  return NextResponse.json({
    ok: true,
    message: "Log line emitted; search Axiom for this string in raw logs.",
    searchInAxiom: SEARCH_MARKER,
  })
}
