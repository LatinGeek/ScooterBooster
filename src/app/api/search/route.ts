import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/lib/api-response"
import { searchPlatform } from "@/lib/search"

const searchQuerySchema = z.object({
  q: z.string().trim().max(100, "La búsqueda no puede superar los 100 caracteres"),
  limit: z.coerce
    .number()
    .int("El límite debe ser un número entero")
    .min(1, "El límite debe ser al menos 1")
    .max(12, "El límite no puede superar 12 resultados")
    .default(6),
})

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const parsed = searchQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
    limit: request.nextUrl.searchParams.get("limit") ?? 6,
  })

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Búsqueda inválida.", 400)
  }

  const query = parsed.data.q
  if (query.length < 2) {
    return ok({
      scooters: [],
      services: [],
      technicians: [],
    })
  }

  const results = await searchPlatform(query, parsed.data.limit)
  return ok(results)
}
