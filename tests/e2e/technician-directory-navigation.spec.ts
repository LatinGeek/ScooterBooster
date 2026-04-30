import { expect, test } from "@playwright/test"
import { dismissCookieBanner } from "./support/ui"

const seededTechnicianOne = {
  displayName: "Carlos Rodríguez",
  location: "Montevideo Centro",
  slug: "carlos-rodriguez",
  query: "Carlos",
}

const seededTechnicianTwo = {
  displayName: "Valentina Suárez",
  slug: "valentina-suarez",
  query: "Valentina",
}

test.describe("technician directory navigation", () => {
  test("clicking a technician card opens the public profile slug and preserves browse state", async ({
    page,
  }) => {
    await page.goto(
      `/technicians?q=${encodeURIComponent(seededTechnicianOne.query)}&location=Montevideo`
    )
    await dismissCookieBanner(page)

    const directoryCard = page
      .locator(`a[href="/technicians/${seededTechnicianOne.slug}?q=Carlos&location=Montevideo"]`)
      .first()
      .locator('xpath=ancestor::div[contains(@class,"group")][1]')

    await expect(directoryCard).toHaveCount(1)
    await directoryCard.click()

    await expect(page).toHaveURL(
      new RegExp(
        `/technicians/${seededTechnicianOne.slug}\\?q=${seededTechnicianOne.query}&location=Montevideo`
      )
    )
    await expect(page.locator("h1")).toContainText("Carlos")
    await expect(page.getByRole("heading", { name: /Ubicaci.n aproximada/ })).toBeVisible()
    await expect(page.getByText(seededTechnicianOne.location).first()).toBeVisible()
    await expect(page.getByRole("heading", { name: /Rese.as/ })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Disponibilidad semanal" })).toBeVisible()

    await page.getByRole("link", { name: "Volver a técnicos" }).click()

    await expect(page).toHaveURL(/\/technicians\?q=Carlos&location=Montevideo/)
    await expect(page.getByRole("heading", { name: "Técnicos Verificados" })).toBeVisible()
    await expect(page.getByDisplayValue(seededTechnicianOne.query)).toBeVisible()
  })

  test("the Ver perfil link inside a technician card also reaches the correct public profile", async ({
    page,
  }) => {
    await page.goto(`/technicians?q=${encodeURIComponent(seededTechnicianTwo.query)}`)
    await dismissCookieBanner(page)

    const directoryCard = page
      .locator(`a[href="/technicians/${seededTechnicianTwo.slug}?q=Valentina"]`)
      .last()
      .locator('xpath=ancestor::div[contains(@class,"group")][1]')

    await expect(directoryCard).toHaveCount(1)
    await page
      .locator(`a[href="/technicians/${seededTechnicianTwo.slug}?q=Valentina"]`)
      .last()
      .click()

    await expect(page).toHaveURL(
      new RegExp(`/technicians/${seededTechnicianTwo.slug}\\?q=${seededTechnicianTwo.query}`)
    )
    await expect(page.locator("h1")).toContainText("Valentina")
    await expect(page.getByRole("heading", { name: "Servicios y precios" })).toBeVisible()
  })
})
