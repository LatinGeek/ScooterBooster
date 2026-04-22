import { expect, test } from "@playwright/test"
import { dismissCookieBanner } from "./support/ui"

function getFutureLocalDateTime(daysFromNow = 2) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(10, 30, 0, 0)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

test("speed-limit bookings require explicit disclaimer acceptance before confirmation", async ({
  page,
}) => {
  await page.goto("/booking/new")
  await dismissCookieBanner(page)

  await page.getByRole("button", { name: /Mi Electric Scooter 1S/i }).click()
  await page.getByRole("button", { name: "Siguiente" }).click()

  await page
    .getByRole("button", { name: /Eliminación de Límite de Velocidad/i })
    .click()
  await page.getByRole("button", { name: "Siguiente" }).click()

  await page.getByRole("button", { name: /Carlos Rodríguez/i }).click()
  await page.getByRole("button", { name: "Siguiente" }).click()

  await page.locator("#scheduled-date").fill(getFutureLocalDateTime())
  await page.getByRole("button", { name: "Siguiente" }).click()

  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Aviso Legal Importante" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Acepto y continúo" })).toBeDisabled()
  await expect(page.getByRole("heading", { name: "Revisá tu reserva" })).toHaveCount(0)

  await page.getByRole("button", { name: "Cancelar" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Revisá tu reserva" })).toHaveCount(0)

  await page.getByRole("button", { name: "Siguiente" }).click()
  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: "Acepto y continúo" }).click()

  await expect(page.getByRole("heading", { name: "Revisá tu reserva" })).toBeVisible()
  await expect(page.getByText("Aviso legal aceptado")).toBeVisible()
})
