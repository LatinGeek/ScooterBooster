// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AdminLiveDataRefresh } from "@/components/admin-live-data-refresh"

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
  }),
}))

describe("AdminLiveDataRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("refreshes the report page on an interval", () => {
    vi.useFakeTimers()

    render(<AdminLiveDataRefresh intervalMs={10_000} />)

    expect(screen.getByText("Datos en vivo")).toBeTruthy()
    expect(mocks.refresh).toHaveBeenCalledTimes(0)

    vi.advanceTimersByTime(10_000)

    expect(mocks.refresh).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it("refreshes when the tab becomes visible again", () => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    })

    render(<AdminLiveDataRefresh intervalMs={10_000} />)

    document.dispatchEvent(new Event("visibilitychange"))
    expect(mocks.refresh).toHaveBeenCalledTimes(0)

    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    })

    document.dispatchEvent(new Event("visibilitychange"))
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })
})
