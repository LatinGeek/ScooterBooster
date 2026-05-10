import { beforeEach, describe, expect, it, vi } from "vitest"

type QueryState = {
  collectionName: string
  filters: Array<{ field: string; op: string; value: unknown }>
  limitValue?: number
}

const mocks = vi.hoisted(() => {
  const createdStates: QueryState[] = []

  const resolveCount = (state: QueryState) => {
    if (state.collectionName === "users") return 11
    if (state.collectionName === "reviews") return 4

    if (state.collectionName === "technicians" && state.filters.some((filter) => filter.field === "isApproved")) {
      return state.filters.some((filter) => filter.value === true) ? 3 : 1
    }

    if (state.collectionName === "bookings") {
      const statusFilter = state.filters.find((filter) => filter.field === "status")
      if (statusFilter?.value === "pending") return 2
      if (statusFilter?.value === "confirmed") return 5
      if (statusFilter?.value === "in_progress") return 1
      if (statusFilter?.value === "completed") return 7
      if (statusFilter?.value === "cancelled") return 1
      if (statusFilter?.value === "expired") return 0
    }

    return 0
  }

  const resolveDocs = (state: QueryState) => {
    if (state.collectionName === "bookings" && state.filters.some((filter) => filter.field === "paymentStatus")) {
      return [
        {
          data: () => ({
            createdAt: "2026-05-10T10:00:00.000Z",
            serviceFee: 45,
            totalPrice: 145,
            paymentStatus: "paid",
            status: "confirmed",
          }),
        },
      ]
    }

    if (state.collectionName === "bookings" && state.filters.some((filter) => filter.field === "createdAt")) {
      return [
        {
          data: () => ({
            createdAt: "2026-05-10T10:00:00.000Z",
            totalPrice: 145,
          }),
        },
      ]
    }

    return []
  }

  const createQuery = (state: QueryState): any => {
    createdStates.push(state)

    return {
      where(field: string, op: string, value: unknown) {
        return createQuery({
          ...state,
          filters: [...state.filters, { field, op, value }],
        })
      },
      orderBy() {
        return createQuery(state)
      },
      limit(limitValue: number) {
        return createQuery({
          ...state,
          limitValue,
        })
      },
      count() {
        return {
          get: vi.fn(async () => ({
            data: () => ({
              count: resolveCount(state),
            }),
          })),
        }
      },
      get: vi.fn(async () => ({
        docs: resolveDocs(state),
      })),
    }
  }

  return {
    createdStates,
    collection: vi.fn((collectionName: string) => createQuery({ collectionName, filters: [] })),
  }
})

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: mocks.collection,
  },
}))

import { getAdminOverviewSnapshot } from "@/lib/admin-overview"

describe("getAdminOverviewSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createdStates.length = 0
  })

  it("counts paid bookings toward retained commission before completion", async () => {
    const snapshot = await getAdminOverviewSnapshot()

    expect(snapshot.totalPlatformRevenue).toBe(45)
    expect(snapshot.totalGMV).toBe(145)
    expect(
      mocks.createdStates.some(
        (state) =>
          state.collectionName === "bookings" &&
          state.filters.some((filter) => filter.field === "paymentStatus" && filter.value === "paid"),
      ),
    ).toBe(true)
  })
})
