import { redirect } from "next/navigation"

/**
 * /booking redirects to the booking wizard at /booking/new
 */
export default function BookingIndexPage() {
  redirect("/booking/new")
}
