import { redirect } from "next/navigation"

/**
 * /booking redirects to the booking wizard at /booking/new
 */
export default async function BookingIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = new URLSearchParams()
  const currentParams = await searchParams

  const aliases: Record<string, string> = {
    modelId: "model",
    serviceId: "service",
    technicianId: "technician",
  }

  for (const [key, rawValue] of Object.entries(currentParams)) {
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue
    if (!value) continue
    params.set(aliases[key] ?? key, value)
  }

  const query = params.toString()
  redirect(query ? `/booking/new?${query}` : "/booking/new")
}
