import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest"

const PROJECT_ID = "scooterbooster-rules"
const RULES = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8")

let testEnv: RulesTestEnvironment

async function seedDoc(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore()
    const segments = path.split("/")
    await setDoc(doc(firestore, ...segments), data)
  })
}

function authedDb(uid: string, claims: Record<string, unknown> = {}) {
  return testEnv.authenticatedContext(uid, claims).firestore()
}

function anonDb() {
  return testEnv.unauthenticatedContext().firestore()
}

describe("firestore.rules", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: RULES,
      },
    })
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  it("allows users to create and read their own profile, but not elevate their role", async () => {
    const userDb = authedDb("user-1")

    await assertSucceeds(
      setDoc(doc(userDb, "users", "user-1"), {
        displayName: "Alan",
        email: "alan@example.com",
        photoURL: null,
        role: "user",
        phone: null,
        createdAt: "2026-04-19T00:00:00.000Z",
        updatedAt: "2026-04-19T00:00:00.000Z",
      })
    )

    await assertSucceeds(getDoc(doc(userDb, "users", "user-1")))

    await assertFails(
      setDoc(doc(userDb, "users", "user-2"), {
        displayName: "Other",
        email: "other@example.com",
        role: "admin",
      })
    )
  })

  it("keeps user profiles private from anonymous visitors", async () => {
    await seedDoc("users/user-1", {
      displayName: "Alan",
      email: "alan@example.com",
      role: "user",
    })

    await assertFails(getDoc(doc(anonDb(), "users", "user-1")))
  })

  it("allows public reads for approved active technicians only", async () => {
    await seedDoc("technicians/tech-public", {
      userId: "tech-user-1",
      displayName: "Tech Public",
      isApproved: true,
      isActive: true,
      rating: 4.8,
      reviewCount: 12,
    })
    await seedDoc("technicians/tech-hidden", {
      userId: "tech-user-2",
      displayName: "Tech Hidden",
      isApproved: false,
      isActive: true,
      rating: 4.2,
      reviewCount: 3,
    })

    await assertSucceeds(getDoc(doc(anonDb(), "technicians", "tech-public")))
    await assertFails(getDoc(doc(anonDb(), "technicians", "tech-hidden")))
  })

  it("lets assigned technicians read their booking feed through their profile mapping", async () => {
    await seedDoc("technicians/tech-1", {
      userId: "tech-user-1",
      displayName: "Tech One",
      isApproved: true,
      isActive: true,
      rating: 4.8,
      reviewCount: 12,
    })
    await seedDoc("bookings/booking-1", {
      userId: "user-1",
      technicianId: "tech-1",
      status: "confirmed",
      createdAt: "2026-04-19T00:00:00.000Z",
    })

    const techDb = authedDb("tech-user-1", { role: "technician" })
    const otherDb = authedDb("tech-user-2", { role: "technician" })
    const bookingsQuery = query(
      collection(techDb, "bookings"),
      where("technicianId", "==", "tech-1")
    )
    const foreignBookingsQuery = query(
      collection(otherDb, "bookings"),
      where("technicianId", "==", "tech-1")
    )

    await assertSucceeds(getDocs(bookingsQuery))
    await assertFails(getDocs(foreignBookingsQuery))
  })

  it("blocks direct client writes to bookings", async () => {
    const userDb = authedDb("user-1")

    await assertFails(
      setDoc(doc(userDb, "bookings", "booking-1"), {
        userId: "user-1",
        technicianId: "tech-1",
        status: "pending",
      })
    )
  })

  it("only allows reviews tied to the caller's completed booking", async () => {
    await seedDoc("bookings/booking-complete", {
      userId: "user-1",
      technicianId: "tech-1",
      status: "completed",
    })
    await seedDoc("bookings/booking-pending", {
      userId: "user-1",
      technicianId: "tech-1",
      status: "pending",
    })

    const userDb = authedDb("user-1")

    await assertSucceeds(
      setDoc(doc(userDb, "reviews", "review-1"), {
        bookingId: "booking-complete",
        userId: "user-1",
        technicianId: "tech-1",
        rating: 5,
        comment: "Excelente trabajo",
      })
    )

    await assertFails(
      setDoc(doc(userDb, "reviews", "review-2"), {
        bookingId: "booking-pending",
        userId: "user-1",
        technicianId: "tech-1",
        rating: 5,
        comment: "Todavía no terminó",
      })
    )
  })

  it("keeps catalog writes admin-only while preserving public reads", async () => {
    await seedDoc("services/service-1", {
      name: "Firmware",
      isActive: true,
    })

    await assertSucceeds(getDoc(doc(anonDb(), "services", "service-1")))
    await assertFails(
      updateDoc(doc(authedDb("user-1"), "services", "service-1"), {
        name: "Hack",
      })
    )
    await assertSucceeds(
      updateDoc(doc(authedDb("admin-1", { role: "admin" }), "services", "service-1"), {
        name: "Firmware Pro",
      })
    )
  })
})
