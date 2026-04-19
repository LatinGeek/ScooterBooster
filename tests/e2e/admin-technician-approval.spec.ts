import { expect, test } from "@playwright/test"
import { signInAs, signOut } from "./support/auth"
import { deleteFixture, upsertPendingTechnicianFixture } from "./support/fixtures"

test.describe("admin technician approval", () => {
  test.afterEach(async ({ page }, testInfo) => {
    const suffix = testInfo.testId.replace(/[^a-z0-9-]/gi, "-").toLowerCase()
    await signOut(page)
    await deleteFixture("technicians", `e2e-tech-${suffix}`)
    await deleteFixture("users", `e2e-tech-user-${suffix}`)
  })

  test("admins can approve a pending technician from the moderation queue", async ({
    page,
  }, testInfo) => {
    const suffix = testInfo.testId.replace(/[^a-z0-9-]/gi, "-").toLowerCase()
    const technicianId = `e2e-tech-${suffix}`
    const userId = `e2e-tech-user-${suffix}`
    const displayName = "Lucía Test"

    await upsertPendingTechnicianFixture({
      technicianId,
      userId,
      displayName,
      email: `${userId}@example.com`,
    })

    await signInAs(page, {
      uid: "e2e-admin-approval",
      role: "admin",
      email: "e2e-admin-approval@example.com",
      displayName: "Admin Approval",
    })

    await page.goto("/admin/technicians")

    await expect(page.getByRole("heading", { name: "Gestión de técnicos" })).toBeVisible()
    await expect(page.getByText(displayName)).toBeVisible()
    await expect(page.getByText("Pendiente", { exact: true })).toBeVisible()

    await page.getByRole("button", { name: "Aprobar" }).click()

    await expect(page.getByText("Aprobado")).toBeVisible()
  })
})
