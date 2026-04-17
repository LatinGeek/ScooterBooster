import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"

export async function GET() {
  // TODO: Fetch reviews from Firestore (by technician ID or booking ID)
  return NextResponse.json<ApiResponse>({ success: true, data: [] })
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Validate with Zod (rating 1-5, comment 10-500 chars)
    // TODO: Verify Firebase auth token
    // TODO: Verify booking exists and is completed
    // TODO: Create review in Firestore
    // TODO: Update technician average rating
    await request.json()

    return NextResponse.json<ApiResponse>({ success: true, data: { id: "placeholder" } })
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
