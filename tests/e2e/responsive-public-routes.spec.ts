import { expect, test } from "@playwright/test"

async function collectConsoleErrors(page: import("@playwright/test").Page) {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  return errors
}

test.describe("responsive public flows", () => {
  test("booking wizard remains usable on a 375px mobile viewport", async ({ page }) => {
    test.setTimeout(45000)
    await page.setViewportSize({ width: 375, height: 812 })
    const errors = await collectConsoleErrors(page)

    await page.goto("/booking/new")

    await expect(page.getByRole("heading", { name: "Nueva Reserva" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "¿Cuál es tu scooter?" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Atrás" })).toBeVisible()
    expect(errors).toEqual([])
  })

  test("technician listing and search results render in landscape mobile", async ({ page }) => {
    test.setTimeout(45000)
    await page.setViewportSize({ width: 812, height: 375 })
    const errors = await collectConsoleErrors(page)

    await page.goto("/technicians")
    await expect(page.getByRole("heading", { name: "Técnicos verificados" })).toBeVisible()

    await page.goto("/search?q=xiaomi")
    await expect(page.getByText("Resultados para")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Encontrá scooters, servicios y técnicos en un solo paso" })
    ).toBeVisible()

    expect(errors).toEqual([])
  })
})
