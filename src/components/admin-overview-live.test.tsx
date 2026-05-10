// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AdminOverviewLive } from "@/components/admin-overview-live"
import type { AdminOverviewSnapshot } from "@/lib/admin-overview"

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}))

vi.mock("@/app/admin/overview-charts", () => ({
  AdminOverviewCharts: ({
    bookingStatusCounts,
    totalGMV,
  }: {
    bookingStatusCounts: AdminOverviewSnapshot["bookingStatusCounts"]
    totalGMV: number
    totalPlatformRevenue: number
    trends: AdminOverviewSnapshot["trends"]
  }) => (
    <div>
      <p>pending: {bookingStatusCounts.pending}</p>
      <p>gmv: {totalGMV}</p>
    </div>
  ),
}))

vi.stubGlobal("fetch", mocks.fetch)

function createSnapshot(overrides: Partial<AdminOverviewSnapshot> = {}): AdminOverviewSnapshot {
  return {
    totalUsers: 10,
    totalReviews: 5,
    approvedTechs: 3,
    pendingTechs: 1,
    bookingStatusCounts: {
      pending: 2,
      confirmed: 4,
      in_progress: 1,
      completed: 6,
      cancelled: 0,
      expired: 0,
    },
    trends: [
      { date: "2026-05-09", label: "9 may", bookings: 1, gmv: 1200 },
      { date: "2026-05-10", label: "10 may", bookings: 2, gmv: 2400 },
    ],
    totalGMV: 3600,
    totalPlatformRevenue: 360,
    activeBookings: 7,
    ...overrides,
  }
}

function createFetchResponse(data: AdminOverviewSnapshot) {
  return Promise.resolve({
    ok: true,
    json: async () => ({ success: true, data }),
  } as Response)
}

describe("AdminOverviewLive", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("refreshes the live booking and GMV data from the backend", async () => {
    mocks.fetch
      .mockResolvedValueOnce(createFetchResponse(createSnapshot({ bookingStatusCounts: { ...createSnapshot().bookingStatusCounts, pending: 8 }, totalGMV: 9999 })))
      .mockResolvedValueOnce(createFetchResponse(createSnapshot({ bookingStatusCounts: { ...createSnapshot().bookingStatusCounts, pending: 12 }, totalGMV: 15000 })))

    render(<AdminOverviewLive initialData={createSnapshot()} intervalMs={1000} />)

    await waitFor(() => expect(screen.getByText("pending: 8")).toBeTruthy())
    await waitFor(() => expect(screen.getByText("gmv: 9999")).toBeTruthy())

    await new Promise((resolve) => setTimeout(resolve, 1100))

    await waitFor(() => expect(screen.getByText("pending: 12")).toBeTruthy())
    await waitFor(() => expect(screen.getByText("gmv: 15000")).toBeTruthy())
  })
})
