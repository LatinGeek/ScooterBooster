import crypto from "crypto"
import { NO_STORE_HEADERS } from "./config"
import type { ModelRules, PatchRule } from "./contract"
import { patchLabel } from "./selection"

/** Makes every response of a handler (including JSON errors from withErrorHandling) `no-store`. */
export function withNoStore<Args extends unknown[], R extends Response>(
  handler: (...args: Args) => Promise<R>,
): (...args: Args) => Promise<R> {
  return async (...args: Args) => {
    const response = await handler(...args)
    for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
      response.headers.set(key, value)
    }
    return response
  }
}

export function sha256Hex(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex")
}

export function findModelRules(models: ModelRules[], model: string | null): ModelRules | null {
  if (!model) return null
  return models.find((candidate) => candidate.model === model) ?? null
}

/** Patches the user may select for a model (unsupported entries are never exposed). */
export function selectablePatches(rules: ModelRules): PatchRule[] {
  return rules.patches
    .filter((rule) => rule.status !== "unsupported")
    .map((rule) => ({ ...rule, label: rule.label ?? patchLabel(rule.code) }))
}
