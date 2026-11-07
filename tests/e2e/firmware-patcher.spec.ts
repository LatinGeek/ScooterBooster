import { expect, test, type Page } from "@playwright/test"
import { signInAs, signOut } from "./support/auth"

/**
 * Firmware Patcher UI (FP-013). Requires the feature flags at build time:
 *
 *   NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED=true FIRMWARE_PATCHER_ENABLED=true \
 *     npx playwright test tests/e2e/firmware-patcher.spec.ts
 *
 * The API is mocked with `page.route` until W3's routes are integrated, and the "firmware" is a
 * synthetic 2 KiB buffer (no real firmware is ever committed). Auth uses the shared custom-token
 * helper, which needs the Firebase dev credentials in `.env.local`.
 */
const FLAGS_ON =
  process.env.NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED === "true" && process.env.FIRMWARE_PATCHER_ENABLED === "true"

const SHA_IN = "1".repeat(64)
const SHA_OUT = "2".repeat(64)
const PATCHED_BYTES = Buffer.from([0xde, 0xad, 0xbe, 0xef])

const CAPABILITIES = {
  enabled: true,
  upstream: { version: "1.1.6", commit: "95a8f339787a1fb6486554d61b573b8e2b688c53" },
  limits: { maxInputBytes: 4 * 1024 * 1024, maxOutputBytes: 8 * 1024 * 1024, maxPatches: 8 },
  models: [],
}

const MI6_DETECTION = {
  detection: {
    ok: true,
    model: "mi6",
    displayName: "Mi 6",
    family: "n32",
    container: "leqi",
    score: 90,
    hits: ["Etiqueta EU1 en el encabezado"],
    notes: [],
    supported: true,
  },
  availablePatches: [
    { code: "sls", status: "supported", kind: "number", min: 1, max: 35, step: 0.1, default: 25 },
    { code: "sld", status: "supported", kind: "number", min: 1, max: 35, step: 0.1, default: 15 },
    { code: "slp", status: "supported", kind: "number", min: 1, max: 35, step: 0.1, default: 6 },
    { code: "mss", status: "experimental", kind: "number", min: 1, max: 9, step: 0.1, default: 5 },
    { code: "mss0exp", status: "experimental", kind: "boolean" },
  ],
}

async function mockFirmwareApi(page: Page, requests: { selection?: string; fullDump?: string; allowExperimental?: string }) {
  await page.route("**/api/admin/firmware-patcher/capabilities", (route) =>
    route.fulfill({ json: { success: true, data: CAPABILITIES } })
  )
  await page.route("**/api/admin/firmware-patcher/detect", (route) =>
    route.fulfill({ json: { success: true, data: MI6_DETECTION } })
  )
  await page.route("**/api/admin/firmware-patcher/patch", (route) => {
    const body = route.request().postData() ?? ""
    requests.selection = /name="selection"\r\n\r\n([^\r]*)/.exec(body)?.[1]
    requests.fullDump = /name="fullDump"\r\n\r\n([^\r]*)/.exec(body)?.[1]
    requests.allowExperimental = /name="allowExperimental"\r\n\r\n([^\r]*)/.exec(body)?.[1]
    const log = [{ name: "sls", offset: 4660, before: "1a00", after: "2300" }]
    return route.fulfill({
      status: 200,
      body: PATCHED_BYTES,
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": 'attachment; filename="patched_mi6_fixture.bin"',
        "x-firmware-model": "mi6",
        "x-firmware-input-sha256": SHA_IN,
        "x-firmware-output-sha256": SHA_OUT,
        "x-firmware-input-size": "2048",
        "x-firmware-output-size": String(PATCHED_BYTES.length),
        "x-firmware-patch-log": Buffer.from(JSON.stringify(log)).toString("base64url"),
      },
    })
  })
}

async function runHappyPath(page: Page, path: string) {
  const requests: { selection?: string; fullDump?: string; allowExperimental?: string } = {}
  await mockFirmwareApi(page, requests)
  await page.goto(path)

  await expect(page.getByRole("heading", { level: 1, name: "Parcheador de firmware" })).toBeVisible()
  // Persistent, non-blocking operational warning.
  await expect(page.getByTestId("firmware-operational-warning")).toContainText("no lo instala ni lo flashea")

  await page.getByLabel("Archivo de firmware (.bin)").setInputFiles({
    name: "fixture.bin",
    mimeType: "application/octet-stream",
    buffer: Buffer.alloc(2048, 7),
  })
  await expect(page.getByTestId("firmware-file-name")).toHaveText("fixture.bin")
  await page.getByRole("button", { name: "Analizar firmware" }).click()
  await expect(page.getByTestId("firmware-detected-model")).toHaveText("Mi 6")

  // Experimental + full dump are visible to both staff roles.
  await expect(page.getByRole("switch", { name: /Volcado completo/ })).toBeVisible()
  await page.getByRole("checkbox", { name: /Límite de velocidad en modo Sport/ }).check()
  await page.getByRole("checkbox", { name: /Arranque MSS0 experimental/ }).check()
  await expect(page.getByTestId("firmware-mss-locked")).toBeVisible()
  await expect(page.getByRole("button", { name: "Aplicar parches" })).toBeDisabled()
  await page.getByRole("checkbox", { name: /Entiendo que los parches experimentales/ }).check()
  await page.getByRole("switch", { name: /Volcado completo/ }).check()
  await page.getByRole("button", { name: "Aplicar parches" }).click()

  const card = page.getByTestId("firmware-result-card")
  await expect(card).toBeVisible()
  await expect(card).toContainText(SHA_IN)
  await expect(card).toContainText(SHA_OUT)

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Descargar patched_mi6_fixture\.bin/ }).click(),
  ])
  expect(download.suggestedFilename()).toBe("patched_mi6_fixture.bin")
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  expect(Buffer.concat(chunks).equals(PATCHED_BYTES)).toBe(true)

  expect(JSON.parse(requests.selection ?? "[]")).toEqual([
    { code: "sls", value: 25 },
    { code: "mss0exp", value: true },
  ])
  expect(requests.allowExperimental).toBe("true")
  expect(requests.fullDump).toBe("true")

  // No firmware ever lands in web storage.
  const stored = await page.evaluate(() => ({
    local: Object.keys(window.localStorage).filter((key) => /firmware|patch/i.test(key)),
    session: Object.keys(window.sessionStorage).length,
  }))
  expect(stored.local).toEqual([])
  expect(stored.session).toBe(0)

  await page.getByRole("button", { name: "Parchear otro archivo" }).click()
  await expect(page.getByTestId("firmware-result-card")).toHaveCount(0)
}

test.describe("firmware patcher", () => {
  test.skip(!FLAGS_ON, "Set NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED=true and FIRMWARE_PATCHER_ENABLED=true")

  test("anonymous visitors are redirected to login", async ({ page }) => {
    await page.goto("/admin/firmware-patcher")
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Ffirmware-patcher$/)
    await page.goto("/dashboard/technician/firmware-patcher")
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard%2Ftechnician%2Ffirmware-patcher$/)
  })

  test.describe("signed in", () => {
    test.afterEach(async ({ page }) => {
      await signOut(page)
    })

    test("regular users cannot open either page", async ({ page }) => {
      await signInAs(page, {
        uid: "e2e-user-1",
        role: "user",
        email: "e2e-user-1@example.com",
        displayName: "E2E User",
      })
      await page.goto("/admin/firmware-patcher")
      await expect(page).not.toHaveURL(/firmware-patcher/)
      await page.goto("/dashboard/technician/firmware-patcher")
      await expect(page).not.toHaveURL(/firmware-patcher/)
    })

    test("admin: upload, detect, patch (experimental + full dump) and download", async ({ page }) => {
      await signInAs(page, {
        uid: "e2e-admin-1",
        role: "admin",
        email: "e2e-admin-1@example.com",
        displayName: "E2E Admin",
      })
      await runHappyPath(page, "/admin/firmware-patcher")
      await expect(page.getByTestId("firmware-role-badge")).toHaveText("Administrador")
    })

    test("technician: upload, detect, patch (experimental + full dump) and download", async ({ page }) => {
      await signInAs(page, {
        uid: "e2e-technician-1",
        role: "technician",
        email: "e2e-technician-1@example.com",
        displayName: "E2E Technician",
      })
      await runHappyPath(page, "/dashboard/technician/firmware-patcher")
      await expect(page.getByTestId("firmware-role-badge")).toHaveText("Técnico")
    })

    test("nav exposes 'Parcheador' and 375px layout has no horizontal scroll", async ({ page }, testInfo) => {
      await signInAs(page, {
        uid: "e2e-technician-1",
        role: "technician",
        email: "e2e-technician-1@example.com",
        displayName: "E2E Technician",
      })
      await page.setViewportSize({ width: 375, height: 812 })
      const requests: { selection?: string } = {}
      await mockFirmwareApi(page, requests)
      await page.goto("/dashboard/technician")
      await expect(page.getByRole("link", { name: "Parcheador" }).first()).toBeVisible()

      await page.goto("/dashboard/technician/firmware-patcher")
      await page.getByLabel("Archivo de firmware (.bin)").setInputFiles({
        name: "fixture.bin",
        mimeType: "application/octet-stream",
        buffer: Buffer.alloc(2048, 7),
      })
      await page.getByRole("button", { name: "Analizar firmware" }).click()
      await expect(page.getByTestId("firmware-detected-model")).toBeVisible()
      await page.getByRole("checkbox", { name: /Límite de velocidad en modo Sport/ }).check()
      await page.getByRole("button", { name: "Aplicar parches" }).click()
      await expect(page.getByTestId("firmware-result-card")).toBeVisible()

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
      expect(overflow).toBeLessThanOrEqual(0)
      await page.screenshot({ path: testInfo.outputPath("firmware-patcher-375.png"), fullPage: true })
    })
  })
})
