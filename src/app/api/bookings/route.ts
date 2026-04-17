import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"

export async function GET() {
  // TODO: Fetch bookings from Firestore (filtered by authenticated user)
  return NextResponse.json<ApiResponse>({ success: true, data: [] })
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Validate with Zod, verify Firebase auth token, create booking in Firestore
    // TODO: Generate MercadoPago payment link
    // TODO: Handle disclaimer acceptance for speed-limit services
    await request.json()

    return NextResponse.json<ApiResponse>({ success: true, data: { id: "placeholder" } })
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
