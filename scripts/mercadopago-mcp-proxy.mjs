import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { config as loadEnv } from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "..")

loadEnv({ path: path.join(repoRoot, ".env.local"), override: false })
loadEnv({ path: path.join(repoRoot, ".env"), override: false })

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

if (!accessToken) {
  console.error(
    "Mercado Pago MCP proxy requires MERCADOPAGO_ACCESS_TOKEN in .env.local or the shell environment.",
  )
  process.exit(1)
}

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx"
const child = spawn(
  npxCommand,
  [
    "-y",
    "mcp-remote@latest",
    "https://mcp.mercadopago.com/mcp",
    "--transport",
    "http-first",
    "--header",
    "Authorization:${AUTH_HEADER}",
  ],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      AUTH_HEADER: `Bearer ${accessToken}`,
    },
    shell: process.platform === "win32",
    stdio: "inherit",
  },
)

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})

child.on("error", (error) => {
  console.error("Failed to start Mercado Pago MCP proxy:", error)
  process.exit(1)
})
