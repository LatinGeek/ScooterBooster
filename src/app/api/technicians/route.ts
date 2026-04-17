import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export async function GET() {
  // TODO: Fetch approved, active technicians from Firestore
  // TODO: Support filters: service, brand, location, rating
  return NextResponse.json<ApiResponse>({
    success: true,
    data: [],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Validate with Zod
    // TODO: Verify Firebase auth token
    // TODO: Create technician application (isApproved: false)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: "placeholder" },
    });
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
