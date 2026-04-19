import { NextRequest } from "next/server"
import { ok, withErrorHandling } from "@/lib/api-response"
import { adminDb } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"

export const GET = withErrorHandling(async (req: NextRequest) => {
  await adminDb.collection("config").doc("global").get()

  return ok({
    ok: true,
    timestamp: new Date().toISOString(),
    route: new URL(req.url).pathname,
  })
})
