import { describe, expect, it } from "vitest"
import { createReviewSchema } from "@/lib/validators/review"

describe("createReviewSchema", () => {
  it("accepts valid reviews", () => {
    expect(
      createReviewSchema.safeParse({
        bookingId: "booking-1",
        technicianId: "tech-1",
        rating: 5,
        comment: "Excelente atención, muy prolijo y rápido.",
      }).success
    ).toBe(true)
  })

  it("rejects comments that are too short", () => {
    const parsed = createReviewSchema.safeParse({
      bookingId: "booking-1",
      technicianId: "tech-1",
      rating: 4,
      comment: "Muy bien",
    })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toContain("10 caracteres")
  })

  it("rejects ratings outside the 1-5 range", () => {
    expect(
      createReviewSchema.safeParse({
        bookingId: "booking-1",
        technicianId: "tech-1",
        rating: 6,
        comment: "Trabajo correcto, pero la puntuación es inválida.",
      }).success
    ).toBe(false)
  })
})
