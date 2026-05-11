import { describe, expect, it } from "vitest"

import { getCoordinatesForLocation, matchUruguayLocation } from "@/lib/uruguay-locations"

describe("Uruguay location presets", () => {
  it("matches Malvín with or without the accent", () => {
    expect(matchUruguayLocation("Malvín, Montevideo")?.label).toBe("Malvín")
    expect(matchUruguayLocation("Malvin, Montevideo")?.label).toBe("Malvín")
  })

  it("returns Malvín coordinates for the technician neighborhood", () => {
    expect(getCoordinatesForLocation("Malvín, Montevideo")).toEqual({
      lat: -34.8858,
      lng: -56.1367,
    })
  })
})
