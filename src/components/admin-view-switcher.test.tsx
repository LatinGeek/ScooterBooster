// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import type { AnchorHTMLAttributes } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AdminViewSwitcher } from "@/components/admin-view-switcher"

const mocks = vi.hoisted(() => ({
  pathname: "/dashboard",
  role: "admin" as "admin" | "user" | "technician" | null,
  loading: false,
}))

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    role: mocks.role,
    loading: mocks.loading,
  }),
}))

describe("AdminViewSwitcher", () => {
  beforeEach(() => {
    mocks.pathname = "/dashboard"
    mocks.role = "admin"
    mocks.loading = false
  })

  it("renders only for admins on the user dashboard", () => {
    render(<AdminViewSwitcher />)

    expect(screen.getByText("Cliente")).toBeTruthy()
    expect(screen.getByText("Admin")).toBeTruthy()
  })

  it("hides on other routes", () => {
    mocks.pathname = "/admin"

    render(<AdminViewSwitcher />)

    expect(screen.queryByText("Cliente")).toBeNull()
    expect(screen.queryByText("Admin")).toBeNull()
  })

  it("hides for non-admin accounts", () => {
    mocks.role = "user"

    render(<AdminViewSwitcher />)

    expect(screen.queryByText("Cliente")).toBeNull()
    expect(screen.queryByText("Admin")).toBeNull()
  })
})
