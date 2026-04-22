import { expect, test } from "@playwright/test"
import { signInAs, signOut } from "./support/auth"
import { dismissCookieBanner } from "./support/ui"

function getFutureLocalDateTime(daysFromNow = 4) {
  const date = new Date()
  const uniquenessSeed = Date.now()
  const extraDays = uniquenessSeed % 5
  const minuteOffset = Math.floor((uniquenessSeed / 1000) % 50)

  date.setDate(date.getDate() + daysFromNow + extraDays)
  date.setHours(14, minuteOffset, 0, 0)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

test.describe("signup to booking handoff", () => {
  test.afterEach(async ({ page }) => {
    await signOut(page)
  })

  test("new users can complete onboarding and reach the MercadoPago handoff", async ({ page }) => {
    let submittedBody: Record<string, unknown> | null = null
    const signupSeed = Date.now()

    await signInAs(page, {
      uid: `e2e-signup-${signupSeed}`,
      role: "user",
      email: `e2e-signup-${signupSeed}@example.com`,
      displayName: "Persona Nueva",
    })

    await page.goto("/onboarding")
    await dismissCookieBanner(page)

    await expect(page.getByRole("heading", { name: "Completa tu perfil" })).toBeVisible()
    await page.getByLabel("Nombre completo *").fill("Persona Nueva")
    await page.getByLabel("Telefono (Uruguay) *").fill("+59899123456")
    await page.getByRole("checkbox", { name: /Acepto recibir notificaciones por WhatsApp/i }).check()
    await page.getByRole("button", { name: "Continuar" }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("link", { name: "Mi panel" }).first()).toBeVisible()

    await page.route("**/api/bookings", async (route) => {
      submittedBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            booking: { id: "e2e-signup-booking-1" },
            paymentLinkUrl:
              "https://www.mercadopago.com.uy/checkout/v1/redirect?pref_id=e2e-signup-booking-1",
          },
        }),
      })
    })

    await page.goto("/booking/new")

    await page.getByRole("button", { name: /Mi Electric Scooter 1S/i }).click()
    await page.getByRole("button", { name: "Siguiente" }).click()

    await page.getByRole("button", { name: /Mantenimiento General/i }).click()
    await page.getByRole("button", { name: "Siguiente" }).click()

    await page.getByRole("button", { name: /Carlos Rodríguez/i }).click()
    await page.getByRole("button", { name: "Siguiente" }).click()

    await page.locator("#scheduled-date").fill(getFutureLocalDateTime())
    await page.locator("#notes").fill("Reserva E2E luego del onboarding")
    await page.getByRole("button", { name: "Siguiente" }).click()

    await expect(page.getByRole("heading", { name: "Revisá tu reserva" })).toBeVisible()
    await page.getByRole("button", { name: "Confirmar reserva" }).click()

    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem("sb:e2e-payment-link")))
      .toMatch(/mercadopago\.com\.uy/)

    expect(submittedBody).toMatchObject({
      scooterModelId: "xiaomi-1s",
      serviceId: "maintenance",
      technicianId: "tech-demo-1",
      notes: "Reserva E2E luego del onboarding",
      disclaimerAccepted: false,
    })
  })
})
