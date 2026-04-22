import { expect, test } from "@playwright/test"
import { signInAs, signOut } from "./support/auth"

function collectRelevantConsoleErrors(page: import("@playwright/test").Page) {
  const errors: string[] = []

  page.on("console", (message) => {
    if (message.type() !== "error") return

    const text = message.text()
    if (text.includes("Could not reach Cloud Firestore backend")) return

    errors.push(text)
  })

  return errors
}

test.describe("desktop authenticated navigation", () => {
  test.afterEach(async ({ page }) => {
    await signOut(page)
  })

  test("signed-in users see the authorized navbar state and notifications", async ({ page }) => {
    const errors = collectRelevantConsoleErrors(page)

    await signInAs(page, {
      uid: "e2e-user-1",
      role: "user",
      email: "e2e-user-1@example.com",
      displayName: "E2E User",
    })

    await page.goto("/")
    await expect(page.getByRole("link", { name: "Mi panel" }).first()).toBeVisible()
    await expect(page.getByRole("link", { name: "Reservar ahora" })).toBeVisible()

    await page.goto("/dashboard/notifications")
    await expect(page.getByRole("heading", { name: "Notificaciones" })).toBeVisible()
    expect(errors).toEqual([])
  })

  test("admins can navigate core desktop operations without runtime issues", async ({ page }) => {
    const errors = collectRelevantConsoleErrors(page)

    await signInAs(page, {
      uid: "e2e-admin-1",
      role: "admin",
      email: "e2e-admin-1@example.com",
      displayName: "E2E Admin",
    })

    await page.goto("/admin/users")
    await expect(page.getByRole("heading", { name: "Usuarios" })).toBeVisible()

    await page.goto("/admin/bookings")
    await expect(page.getByRole("heading", { name: "Reservas y pagos" })).toBeVisible()

    await page.goto("/admin/audit")
    await expect(page.getByRole("heading", { name: "Auditoría" })).toBeVisible()
    expect(errors).toEqual([])
  })

  test("technicians can navigate profile management on desktop", async ({ page }) => {
    const errors = collectRelevantConsoleErrors(page)

    await signInAs(page, {
      uid: "demo-user-1",
      role: "technician",
      email: "tech-demo-1@example.com",
      displayName: "Carlos Rodríguez",
    })

    await page.goto("/dashboard/technician/profile")
    await expect(page.getByRole("heading", { name: "Perfil profesional" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Guardar perfil/i })).toBeVisible()
    expect(errors).toEqual([])
  })
})
