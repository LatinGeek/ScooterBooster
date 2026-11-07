/**
 * Test-only helpers. Never imported by runtime code.
 *
 * Real firmware binaries are never committed; tests read them from the manifest's
 * `fixturesRoot` and skip when they are absent (e.g. CI without the private fixture volume).
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import manifest from "../../../../scripts/firmware-parity/fixture-manifest.json"
import goldens from "./__fixtures__/parity-goldens.json"

export interface FixtureEntry {
  id: string
  path: string
  sha256: string
  size: number
}

export interface Manifest {
  fixturesRoot: string
  models: Record<string, { realFixtures: FixtureEntry[] }>
}

export interface DetectionGolden {
  id: string
  fixtureId: string
  inputSha256: string
  detection: Record<string, unknown>
}

export interface VectorGolden {
  id: string
  model: string
  fixtureId: string
  inputSha256: string
  selection: Array<{ code: string; value: number | string | boolean }>
  fullDump: boolean
  allowExperimental: boolean
  outputSha256: string
  outputSize: number
  log: Array<{ name: string; offset: string; before: string; after: string }>
}

export interface ParityGoldens {
  reference: Record<string, unknown>
  detections: DetectionGolden[]
  vectors: VectorGolden[]
}

export const FIXTURE_MANIFEST = manifest as Manifest
export const PARITY_GOLDENS = goldens as ParityGoldens

export function fixturePath(fixtureId: string): string | null {
  for (const info of Object.values(FIXTURE_MANIFEST.models)) {
    const found = info.realFixtures.find((entry) => entry.id === fixtureId)
    if (found) return join(FIXTURE_MANIFEST.fixturesRoot, found.path)
  }
  return null
}

export function readFixture(fixtureId: string): Uint8Array {
  const path = fixturePath(fixtureId)
  if (!path) throw new Error(`unknown fixture ${fixtureId}`)
  return new Uint8Array(readFileSync(path))
}

export const FIXTURES_AVAILABLE = Object.values(FIXTURE_MANIFEST.models).every((info) =>
  info.realFixtures.every((entry) => {
    const path = join(FIXTURE_MANIFEST.fixturesRoot, entry.path)
    return existsSync(path)
  })
)

export function fixturesAvailable(): boolean {
  return FIXTURES_AVAILABLE
}
