import { expect, test } from "@playwright/test"
import { signInAs, signOut } from "./support/auth"

test.describe("authenticated dashboards", () => {
  test.afterEach(async ({ page }) => {
    await signOut(page)
  })

  test("signed-in users can open their dashboard", async ({ page }) => {
    await signInAs(page, {
      uid: "e2e-user-1",
      role: "user",
      email: "e2e-user-1@example.com",
      displayName: "E2E User",
    })

    await page.goto("/dashboard")

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("heading", { name: "Mis reservas" })).toBeVisible()
  })

  test("signed-in technicians can open the technician dashboard", async ({ page }) => {
    await signInAs(page, {
      uid: "demo-user-1",
      role: "technician",
      email: "tech-demo-1@example.com",
      displayName: "Carlos Rodríguez",
    })

    await page.goto("/dashboard/technician")

    await expect(page).toHaveURL(/\/dashboard\/technician$/)
    await expect(page.getByRole("heading", { name: /Hola, Carlos/i })).toBeVisible()
  })

  test("signed-in admins can open the admin overview", async ({ page }) => {
    await signInAs(page, {
      uid: "e2e-admin-1",
      role: "admin",
      email: "e2e-admin-1@example.com",
      displayName: "E2E Admin",
    })

    await page.goto("/admin")

    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole("heading", { name: "Panel de administración" })).toBeVisible()
  })
})
