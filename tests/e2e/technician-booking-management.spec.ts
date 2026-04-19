import { expect, test } from "@playwright/test"
import { signInAs, signOut } from "./support/auth"
import { createTechnicianBookingFixture, deleteFixture } from "./support/fixtures"

function getFutureIsoDate(daysFromNow = 4) {
  const seed = Date.now()
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow + (seed % 5))
  date.setHours(15, Math.floor((seed / 1000) % 45), 0, 0)
  return date.toISOString()
}

test.describe("technician booking management", () => {
  test.afterEach(async ({ page }, testInfo) => {
    const bookingId = `e2e-technician-booking-${testInfo.testId.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`
    await signOut(page)
    await deleteFixture("bookings", bookingId)
    await deleteFixture("users", `${bookingId}-user`)
  })

  test("technicians can move a confirmed booking through in-progress to completed", async ({
    page,
  }, testInfo) => {
    const bookingId = `e2e-technician-booking-${testInfo.testId.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`

    await createTechnicianBookingFixture({
      bookingId,
      userId: `${bookingId}-user`,
      technicianId: "tech-demo-1",
      scheduledDate: getFutureIsoDate(),
      status: "confirmed",
      notes: "Reserva E2E para transición técnica",
    })

    await signInAs(page, {
      uid: "demo-user-1",
      role: "technician",
      email: "tech-demo-1@example.com",
      displayName: "Carlos Rodríguez",
    })

    await page.goto("/dashboard/technician/bookings")

    await expect(page.getByRole("heading", { name: "Reservas" })).toBeVisible()
    await page.getByRole("button", { name: "Próximas" }).click()
    await expect(page.getByText("Reserva E2E para transición técnica")).toBeVisible()

    await page.getByRole("button", { name: "Iniciar servicio" }).click()
    await expect(page.getByText("En curso")).toBeVisible()

    await page.getByRole("button", { name: "Marcar completado" }).click()
    await page.getByRole("button", { name: "Historial" }).click()
    await expect(page.getByText("Completada")).toBeVisible()
    await expect(page.getByText("Reserva E2E para transición técnica")).toBeVisible()
  })
})
