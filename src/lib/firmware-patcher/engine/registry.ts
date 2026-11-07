/**
 * Static allow-list model dispatch (SPEC FP-005). There is deliberately no dynamic `import()`,
 * `require()` or string-to-module lookup: a user-controlled model can never select code.
 */

import type { PatchableModel } from "../types"
import type { CorePatcher } from "./core"
import { Mi4Patcher } from "./models/mi4"
import { Mi4litePatcher } from "./models/mi4lite"
import { Mi4pro2ndPatcher } from "./models/mi4pro2nd"
import { Mi5Patcher } from "./models/mi5"
import { Mi5elitePatcher } from "./models/mi5elite"
import { Mi5maxPatcher } from "./models/mi5max"
import { Mi5plusPatcher } from "./models/mi5plus"
import { Mi5proPatcher } from "./models/mi5pro"
import { Mi6Patcher } from "./models/mi6"
import { Mi6litePatcher } from "./models/mi6lite"
import { Ultra4Patcher } from "./models/ultra4"

export type PatcherConstructor = new (data: Uint8Array) => CorePatcher

export const MODEL_PATCHERS: Readonly<Record<PatchableModel, PatcherConstructor>> = {
  mi4: Mi4Patcher,
  mi4lite: Mi4litePatcher,
  mi4pro2nd: Mi4pro2ndPatcher,
  mi5: Mi5Patcher,
  mi5max: Mi5maxPatcher,
  mi5pro: Mi5proPatcher,
  mi5elite: Mi5elitePatcher,
  mi5plus: Mi5plusPatcher,
  mi6: Mi6Patcher,
  mi6lite: Mi6litePatcher,
  ultra4: Ultra4Patcher,
}

export function createPatcher(model: PatchableModel, data: Uint8Array): CorePatcher {
  return new MODEL_PATCHERS[model](data)
}
