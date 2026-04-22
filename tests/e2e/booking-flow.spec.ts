import { expect, test } from "@playwright/test"
import { dismissCookieBanner } from "./support/ui"

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
  test("booking wizard submits the expected payload and captures the MercadoPago handoff", async ({
    page,
  }) => {
    let submittedBody: Record<string, unknown> | null = null

    await page.route("**/api/bookings", async (route) => {
      submittedBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            booking: { id: "e2e-booking-1" },
            paymentLinkUrl:
              "https://www.mercadopago.com.uy/checkout/v1/redirect?pref_id=e2e-booking-1",
          },
        }),
      })
    })

    await page.goto("/booking/new")
    await dismissCookieBanner(page)

    await page.getByRole("button", { name: /Mi Electric Scooter 1S/i }).click()
    await page.getByRole("button", { name: "Siguiente" }).click()

    await page.getByRole("button", { name: /Mantenimiento General/i }).click()
    await page.getByRole("button", { name: "Siguiente" }).click()

    await page.getByRole("button", { name: /Carlos Rodr\u00edguez/i }).click()
    await page.getByRole("button", { name: "Siguiente" }).click()

    await page.locator("#scheduled-date").fill(getFutureLocalDateTime())
    await page.locator("#notes").fill("Reserva E2E generada desde Playwright")
    await page.getByRole("button", { name: "Siguiente" }).click()

    await expect(page.getByRole("heading", { name: "Revis\u00e1 tu reserva" })).toBeVisible()
    await page.getByRole("button", { name: "Confirmar reserva" }).click()

    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem("sb:e2e-payment-link")))
      .toMatch(/mercadopago\.com\.uy/)

    expect(submittedBody).toMatchObject({
      scooterModelId: "xiaomi-1s",
      serviceId: "maintenance",
      technicianId: "tech-demo-1",
      notes: "Reserva E2E generada desde Playwright",
      disclaimerAccepted: false,
    })
    expect(typeof submittedBody?.scheduledDate).toBe("string")
  })
})
