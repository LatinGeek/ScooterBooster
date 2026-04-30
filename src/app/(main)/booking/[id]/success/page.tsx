import { redirect } from "next/navigation"

export default async function BookingPaymentSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const rawSearchParams = await searchParams
  const qs = new URLSearchParams()

  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const entry of value) qs.append(key, entry)
      continue
    }
    qs.set(key, value)
  }

  qs.set("return_status", "success")
  redirect(`/booking/${id}?${qs.toString()}`)
}
