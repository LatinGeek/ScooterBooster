import { defineConfig, devices } from "@playwright/test"

const baseURL = "http://127.0.0.1:3000"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start:e2e",
    env: {
      ...process.env,
      NEXT_PUBLIC_E2E_AUTH: "enabled",
      MERCADOPAGO_ACCESS_TOKEN: "",
      MERCADOPAGO_PUBLIC_KEY: "",
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120000,
  },
})
