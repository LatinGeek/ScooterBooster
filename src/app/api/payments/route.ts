import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"

// Webhook handler for MercadoPago payment notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.type === "payment") {
      // TODO: Verify payment with MercadoPago API
      // TODO: Update booking paymentStatus to "paid" and status to "confirmed"
      // const bookingId = paymentData.external_reference?.replace("booking_", "");
    }

    return NextResponse.json<ApiResponse>({ success: true })
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error procesando webhook" },
      { status: 500 }
    )
  }
}
