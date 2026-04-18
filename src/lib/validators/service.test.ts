import { describe, expect, it } from "vitest"
import { createServiceSchema, serviceCategorySchema } from "@/lib/validators/service"

describe("serviceCategorySchema", () => {
  it("accepts supported service categories", () => {
    expect(serviceCategorySchema.safeParse("firmware").success).toBe(true)
  })

  it("rejects unsupported service categories", () => {
    expect(serviceCategorySchema.safeParse("repairs").success).toBe(false)
  })
})

describe("createServiceSchema", () => {
  it("applies defaults for requiresDisclaimer and isActive", () => {
    const parsed = createServiceSchema.parse({
      name: "Firmware Stage 1",
      slug: "firmware-stage-1",
      description: "Actualización completa para mejorar respuesta y autonomía.",
      category: "firmware",
      estimatedDuration: 45,
    })

    expect(parsed.requiresDisclaimer).toBe(false)
    expect(parsed.isActive).toBe(true)
  })

  it("rejects slugs with uppercase or spaces", () => {
    const parsed = createServiceSchema.safeParse({
      name: "Firmware Stage 1",
      slug: "Firmware Stage 1",
      description: "Actualización completa para mejorar respuesta y autonomía.",
      category: "firmware",
      estimatedDuration: 45,
    })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toContain("slug")
  })
})
