import { expect, test } from "@playwright/test"

test("booking wizard page loads without the server error fallback", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  await page.goto("/booking/new")

  await expect(page.getByRole("heading", { name: "Nueva Reserva" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "This page couldn\u2019t load" })).toHaveCount(0)
  expect(errors).toEqual([])
})

test("technician directory renders without runtime console errors", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  await page.goto("/technicians")

  await expect(page.getByRole("heading", { name: "Técnicos verificados" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "This page couldn\u2019t load" })).toHaveCount(0)
  expect(errors).toEqual([])
})

test("search results page renders for a basic query", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  await page.goto("/search?q=xiaomi")

  await expect(
    page.getByRole("heading", { name: "Encontrá scooters, servicios y técnicos en un solo paso" })
  ).toBeVisible()
  await expect(page.getByText("Resultados para").first()).toBeVisible()
  await expect(page.getByRole("heading", { name: "This page couldn\u2019t load" })).toHaveCount(0)
  expect(errors).toEqual([])
})

test("technician zero-results flow offers clear recovery actions", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  await page.goto("/technicians?q=zzznada&service=service-battery-upgrade")

  await expect(
    page.getByRole("heading", { name: "No hay técnicos para esta combinación" })
  ).toBeVisible()
  await expect(page.getByText("Filtros activos")).toBeVisible()
  await expect(page.getByRole("link", { name: /Quitar búsqueda/ })).toBeVisible()
  await expect(page.getByRole("link", { name: "Quitar servicios" })).toBeVisible()
  expect(errors).toEqual([])
})
