import baseConfig from "./vitest.config"
import { defineConfig, mergeConfig } from "vitest/config"

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["tests/firestore.rules.test.ts"],
      exclude: ["**/node_modules/**", "**/.git/**"],
    },
  })
)
