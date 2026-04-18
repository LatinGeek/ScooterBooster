import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ok } from "@/lib/api-response"
import { searchTechnicians } from "@/lib/search"
import type { ApiResponse } from "@/types"

const technicianSearchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  service: z.array(z.string().trim().min(1)).default([]),
  brand: z.string().trim().min(1).optional(),
  location: z.string().trim().max(100).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
})

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const parsed = technicianSearchQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    service: request.nextUrl.searchParams.getAll("service"),
    brand: request.nextUrl.searchParams.get("brand") ?? undefined,
    location: request.nextUrl.searchParams.get("location") ?? undefined,
    minRating: request.nextUrl.searchParams.get("minRating") ?? undefined,
    minPrice: request.nextUrl.searchParams.get("minPrice") ?? undefined,
    maxPrice: request.nextUrl.searchParams.get("maxPrice") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: parsed.error.issues[0]?.message ?? "Filtros inválidos." },
      { status: 400 }
    )
  }

  const technicians = await searchTechnicians({
    query: parsed.data.q,
    serviceIds: parsed.data.service,
    brandId: parsed.data.brand,
    location: parsed.data.location,
    minRating: parsed.data.minRating,
    minPrice: parsed.data.minPrice,
    maxPrice: parsed.data.maxPrice,
  })

  return ok(technicians)
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Validate with Zod
    // TODO: Verify Firebase auth token
    // TODO: Create technician application (isApproved: false)
    await request.json()

    return NextResponse.json<ApiResponse>({ success: true, data: { id: "placeholder" } })
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
