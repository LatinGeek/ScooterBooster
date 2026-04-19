import { expect, test } from "@playwright/test"

test("logged-out users are redirected to login when visiting dashboard", async ({ page }) => {
  await page.goto("/dashboard")

  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/)
  await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible()
})
