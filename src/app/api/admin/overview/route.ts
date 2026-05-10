import { NextResponse } from "next/server"
import { getAdminOverviewSnapshot } from "@/lib/admin-overview"
import { getSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: "Debes iniciar sesión." }, { status: 401 })
  }

  if (session.role !== "admin") {
    return NextResponse.json({ success: false, error: "No autorizado." }, { status: 403 })
  }

  const data = await getAdminOverviewSnapshot()
  return NextResponse.json({ success: true, data })
}
