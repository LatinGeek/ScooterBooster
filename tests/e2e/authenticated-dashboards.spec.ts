import { expect, test } from "@playwright/test"
import { signInAs, signOut } from "./support/auth"
import { createTechnicianBookingFixture, deleteFixture } from "./support/fixtures"

test.describe("authenticated dashboards", () => {
  test.afterEach(async ({ page }) => {
    await signOut(page)
  })

  test("signed-in users can open their dashboard", async ({ page }) => {
    await signInAs(page, {
      uid: "e2e-user-1",
      role: "user",
      email: "e2e-user-1@example.com",
      displayName: "E2E User",
    })

    await page.goto("/dashboard")

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("heading", { name: "Mis reservas" })).toBeVisible()
  })

  test("signed-in users can open their dashboard with a paid booking already linked", async ({
    page,
  }) => {
    const bookingId = `e2e-dashboard-booking-${Date.now()}`

    await createTechnicianBookingFixture({
      bookingId,
      userId: "e2e-user-1",
      technicianId: "tech-demo-1",
      scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: "confirmed",
      notes: "Reserva confirmada para validar el panel",
    })

    try {
      await signInAs(page, {
        uid: "e2e-user-1",
        role: "user",
        email: "e2e-user-1@example.com",
        displayName: "E2E User",
      })

      await page.goto("/dashboard")

      await expect(page).toHaveURL(/\/dashboard$/)
      await expect(page.getByRole("heading", { name: "Mis reservas" })).toBeVisible()
      await expect(page.getByText("Mantenimiento General")).toBeVisible()
      await expect(page.getByText("Carlos Rodríguez")).toBeVisible()
    } finally {
      await deleteFixture("bookings", bookingId)
    }
  })

  test("signed-in technicians can open the technician dashboard", async ({ page }) => {
    await signInAs(page, {
      uid: "demo-user-1",
      role: "technician",
      email: "tech-demo-1@example.com",
      displayName: "Carlos Rodríguez",
    })

    await page.goto("/dashboard/technician")

    await expect(page).toHaveURL(/\/dashboard\/technician$/)
    await expect(page.getByRole("heading", { name: /Hola, Carlos/i })).toBeVisible()
  })

  test("signed-in admins can open the admin overview", async ({ page }) => {
    await signInAs(page, {
      uid: "e2e-admin-1",
      role: "admin",
      email: "e2e-admin-1@example.com",
      displayName: "E2E Admin",
    })

    await page.goto("/admin")

    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole("heading", { name: "Panel de administración" })).toBeVisible()
  })
})
