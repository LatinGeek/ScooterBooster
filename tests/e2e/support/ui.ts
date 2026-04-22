import { type Page } from "@playwright/test"

export async function dismissCookieBanner(page: Page) {
  const essentialOnlyButton = page.getByRole("button", { name: "Solo esenciales" })
  const visible = await essentialOnlyButton
    .waitFor({ state: "visible", timeout: 1500 })
    .then(() => true)
    .catch(() => false)

  if (visible) {
    await essentialOnlyButton.click()
  }
}
