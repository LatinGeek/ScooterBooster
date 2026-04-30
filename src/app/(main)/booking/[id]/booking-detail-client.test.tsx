// @vitest-environment jsdom

import type { ButtonHTMLAttributes } from "react"
import { act, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BookingDetailClient } from "@/app/(main)/booking/[id]/booking-detail-client"
import type { Booking, ScooterModel, Service, Technician } from "@/types"

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
    push: mocks.push,
  }),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    asChild,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock("@/components/review-form", () => ({
  ReviewForm: () => <div>Review form</div>,
}))

vi.mock("@/lib/analytics", () => ({
  trackAnalyticsEventOncePerSession: vi.fn(),
}))

vi.mock("@/lib/messages", () => ({
  buildWhatsAppUrl: () => "https://wa.test",
  WA_MESSAGES: {
    userContactTechnician: () => "hello",
  },
}))

function createBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1",
    userId: "user-1",
    technicianId: "tech-1",
    serviceId: "service-1",
    scooterModelId: "model-1",
    status: "pending",
    scheduledDate: "2099-04-20T15:00:00.000Z",
    notes: null,
    basePrice: 1800,
    serviceFee: 100,
    totalPrice: 1900,
    paymentStatus: "pending",
    paymentId: null,
    paymentLinkId: "pref-1",
    paymentLinkUrl: "https://mp.test/pay",
    disclaimerAccepted: false,
    disclaimerAcceptedAt: null,
    disclaimerVersion: null,
    refundedAt: null,
    reminderSentAt: null,
    createdAt: "2099-04-19T15:00:00.000Z",
    updatedAt: "2099-04-19T15:00:00.000Z",
    ...overrides,
  }
}

const technician: Technician = {
  id: "tech-1",
  slug: "carlos",
  userId: "tech-user-1",
  displayName: "Carlos",
  bio: "Bio",
  photoURL: "",
  phone: "",
  whatsappNumber: "",
  location: "Montevideo",
  services: ["service-1"],
  supportedBrands: ["brand-1"],
  availability: {},
  pricing: { "service-1": { basePrice: 1800, currency: "UYU" } },
  rating: 5,
  reviewCount: 1,
  isApproved: true,
  isActive: true,
  createdAt: "2099-04-19T15:00:00.000Z",
  updatedAt: "2099-04-19T15:00:00.000Z",
}

const service: Service = {
  id: "service-1",
  name: "Firmware",
  slug: "firmware",
  description: "",
  category: "firmware",
  estimatedDuration: 60,
  requiresDisclaimer: false,
  isActive: true,
  createdAt: "2099-04-19T15:00:00.000Z",
}

const scooterModel: ScooterModel = {
  id: "model-1",
  brandId: "brand-1",
  name: "Xiaomi 1S",
  slug: "xiaomi-1s",
  imageURL: null,
  specs: {
    maxSpeed: 25,
    range: 30,
    battery: "36V",
    motor: "500W",
    weight: 12,
  },
  compatibleServices: ["service-1"],
  isActive: true,
  createdAt: "2099-04-19T15:00:00.000Z",
}

describe("BookingDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("syncs fresh booking props after a payment webhook confirmation", async () => {
    const { rerender } = render(
      <BookingDetailClient
        booking={createBooking()}
        technician={technician}
        service={service}
        scooterModel={scooterModel}
        role="user"
        userId="user-1"
      />
    )

    expect(screen.getAllByText("Reserva online pendiente").length).toBeGreaterThan(0)

    rerender(
      <BookingDetailClient
        booking={createBooking({
          status: "confirmed",
          paymentStatus: "paid",
          paymentId: "payment-1",
        })}
        technician={technician}
        service={service}
        scooterModel={scooterModel}
        role="user"
        userId="user-1"
        paymentReturnStatus="success"
      />
    )

    expect(screen.getByText("Pago acreditado y reserva confirmada")).toBeTruthy()
    expect(screen.getAllByText("Reserva online paga").length).toBeGreaterThan(0)
  })

  it("auto-refreshes the booking after returning from Mercado Pago with a pending sync", async () => {
    vi.useFakeTimers()

    render(
      <BookingDetailClient
        booking={createBooking()}
        technician={technician}
        service={service}
        scooterModel={scooterModel}
        role="user"
        userId="user-1"
        paymentReturnStatus="success"
      />
    )

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(mocks.refresh).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})
