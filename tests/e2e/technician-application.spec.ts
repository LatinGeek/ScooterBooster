import { expect, test } from "@playwright/test"
import { signInAs, signOut } from "./support/auth"
import { deleteFixture, upsertUserFixture } from "./support/fixtures"

test.describe("technician application", () => {
  const applicantUid = "e2e-tech-applicant-1"

  test.afterEach(async ({ page }) => {
    await signOut(page)
    await deleteFixture("technicians", applicantUid).catch(() => {})
  })

  test("users can submit a technician application and see the pending state", async ({
    page,
  }) => {
    await upsertUserFixture({
      userId: applicantUid,
      displayName: "Tecnico Postulante",
      email: "e2e-tech-applicant-1@example.com",
      phone: "+59899127777",
      role: "user",
    })

    await signInAs(page, {
      uid: applicantUid,
      role: "user",
      email: "e2e-tech-applicant-1@example.com",
      displayName: "Tecnico Postulante",
    })

    await page.goto("/technicians/apply")

    await page.locator("#bio").fill(
      "Tecnico con experiencia en mantenimiento urbano, firmware Xiaomi y diagnostico preventivo en Montevideo."
    )
    await page.locator("#location").fill("Pocitos, Montevideo")
    await page.locator("#whatsappNumber").fill("59899127777")
    await page.locator("#basePrice").fill("1800")
    await page.getByLabel("Mantenimiento General").check()
    await page.getByLabel("Actualización de Firmware").check()
    await page.getByLabel("Xiaomi").check()
    await page.getByLabel("Navee").check()
    await page.getByRole("button", { name: "Enviar postulacion" }).click()

    await expect(page).toHaveURL(/\/technicians\/apply\?submitted=1$/)
    await expect(page.getByRole("heading", { name: /Tu postulacion ya fue enviada/i })).toBeVisible()
    await expect(page.getByText("Pocitos, Montevideo")).toBeVisible()
  })
})
