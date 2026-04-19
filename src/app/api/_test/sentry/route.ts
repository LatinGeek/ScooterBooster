import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 })
  }

  try {
    throw new Error("Sentry test route triggered")
  } catch (error) {
    Sentry.captureException(error)
  }

  await Sentry.flush(2000)

  return NextResponse.json({ ok: true, message: "Sentry test event sent" })
}
