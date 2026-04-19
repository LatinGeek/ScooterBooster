import { expect, test } from "@playwright/test"
import { signInAs, signOut } from "./support/auth"

function getFutureLocalDateTime(daysFromNow = 3) {
  const date = new Date()
  const uniquenessSeed = Date.now()
  const extraDays = uniquenessSeed % 7
  const minuteOffset = Math.floor((uniquenessSeed / 1000) % 50)

  date.setDate(date.getDate() + daysFromNow + extraDays)
  date.setHours(11, minuteOffset, 0, 0)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

test.describe("booking flow", () => {
  test.afterEach(async ({ page }) => {
    await signOut(page)
  })

  test("signed-in users can create a booking and land on the booking detail page", async ({
    page,
  }) => {
    await signInAs(page, {
      uid: "e2e-booking-user-1",
      role: "user",
      email: "e2e-booking-user-1@example.com",
      displayName: "Reserva E2E",
    })

    await page.goto("/booking/new")

    await page.getByRole("button", { name: /Mi Electric Scooter 1S/i }).click()
    await page.getByRole("button", { name: "Siguiente" }).click()

    await page.getByRole("button", { name: /Mantenimiento General/i }).click()
    await page.getByRole("button", { name: "Siguiente" }).click()

    await page.getByRole("button", { name: /Carlos Rodríguez/i }).click()
    await page.getByRole("button", { name: "Siguiente" }).click()

    await page.locator("#scheduled-date").fill(getFutureLocalDateTime())
    await page.locator("#notes").fill("Reserva E2E generada desde Playwright")
    await page.getByRole("button", { name: "Siguiente" }).click()

    await expect(page.getByRole("heading", { name: "Revisá tu reserva" })).toBeVisible()
    await page.getByRole("button", { name: "Confirmar reserva" }).click()

    await expect(page).toHaveURL(/\/booking\/.+$/)
    await expect(page.getByRole("heading", { name: "Detalle de Reserva" })).toBeVisible()
    await expect(page.getByText("Mantenimiento General")).toBeVisible()
    await expect(page.getByText("Pendiente de pago")).toBeVisible()
    await expect(page.getByText("Reserva E2E generada desde Playwright")).toBeVisible()
  })
})
