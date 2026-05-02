import { expect, test } from "@playwright/test"
import { signInAs, signOut } from "./support/auth"
import { deleteFixture, upsertApprovedTechnicianFixture } from "./support/fixtures"

test.describe("technician profile management", () => {
  const technicianUid = "e2e-tech-profile-1"

  test.afterEach(async ({ page }) => {
    await signOut(page)
    await deleteFixture("technicians", technicianUid).catch(() => {})
    await deleteFixture("users", technicianUid).catch(() => {})
  })

  test("technicians can update their public profile from the dashboard", async ({ page }) => {
    await upsertApprovedTechnicianFixture({
      technicianId: technicianUid,
      userId: technicianUid,
      displayName: "Carlos Perfil",
      email: "e2e-tech-profile-1@example.com",
    })

    await signInAs(page, {
      uid: technicianUid,
      role: "technician",
      email: "e2e-tech-profile-1@example.com",
      displayName: "Carlos Perfil",
      phone: "+59899116666",
    })

    await page.goto("/dashboard/technician/profile")

    await expect(page.getByRole("heading", { name: "Perfil profesional" })).toBeVisible()

    await page.locator("#displayName").first().fill("Carlos Perfil Premium")
    await page
      .locator("#bio")
      .first()
      .fill(
        "Técnico especializado en firmware, mantenimiento preventivo y diagnóstico rápido para scooters urbanos en Montevideo."
      )
    await page.locator("#location").first().fill("Punta Carretas, Montevideo")
    await page.getByRole("button", { name: "Guardar perfil" }).click()

    await expect(page.getByText("Perfil técnico guardado correctamente.")).toBeVisible()
    await expect(page.getByText("Carlos Perfil Premium")).toBeVisible()
    await expect(page.locator("aside").getByText("Punta Carretas, Montevideo").first()).toBeVisible()
  })
})
