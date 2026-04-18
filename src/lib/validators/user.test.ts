import { describe, expect, it } from "vitest"
import { updateUserProfileSchema, userRoleSchema } from "@/lib/validators/user"

describe("userRoleSchema", () => {
  it("accepts supported platform roles", () => {
    expect(userRoleSchema.safeParse("technician").success).toBe(true)
  })

  it("rejects unknown roles", () => {
    expect(userRoleSchema.safeParse("superadmin").success).toBe(false)
  })
})

describe("updateUserProfileSchema", () => {
  it("accepts nullable phone numbers", () => {
    expect(
      updateUserProfileSchema.safeParse({
        displayName: "Valentina",
        phone: null,
      }).success
    ).toBe(true)
  })

  it("rejects phone numbers outside the Uruguay format", () => {
    const parsed = updateUserProfileSchema.safeParse({
      displayName: "Valentina",
      phone: "099111000",
    })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toContain("+598")
  })
})
