// ScooterBooster — TypeScript Type Definitions

export interface User {
  uid: string
  displayName: string
  email: string
  photoURL: string | null
  role: "user" | "technician" | "admin"
  phone: string | null
  createdAt: string
  updatedAt: string
}

export interface Technician {
  id: string
  userId: string
  displayName: string
  bio: string
  photoURL: string
  phone: string
  whatsappNumber: string
  location: string
  services: string[]
  supportedBrands: string[]
  availability: Record<string, DayAvailability>
  pricing: Record<string, ServicePricing>
  rating: number
  reviewCount: number
  isApproved: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DayAvailability {
  start: string
  end: string
  isAvailable: boolean
}

export interface ServicePricing {
  basePrice: number
  currency: "UYU"
}

export interface ScooterBrand {
  id: string
  name: string
  slug: string
  logoURL: string | null
  isActive: boolean
  createdAt: string
}

export interface ScooterModel {
  id: string
  brandId: string
  name: string
  slug: string
  imageURL: string | null
  specs: ScooterSpecs
  compatibleServices: string[]
  isActive: boolean
  createdAt: string
}

export interface ScooterSpecs {
  maxSpeed: number
  range: number
  battery: string
  motor: string
  weight: number
}

export type ServiceCategory = "speed-limit" | "firmware" | "cruise-control" | "maintenance"

export interface Service {
  id: string
  name: string
  slug: string
  description: string
  category: ServiceCategory
  estimatedDuration: number
  requiresDisclaimer: boolean
  isActive: boolean
  createdAt: string
}

export type BookingStatus = "pending" | "confirmed" | "in-progress" | "completed" | "cancelled"

export type PaymentStatus = "pending" | "paid" | "refunded"

export interface Booking {
  id: string
  userId: string
  technicianId: string
  serviceId: string
  scooterModelId: string
  status: BookingStatus
  scheduledDate: string
  notes: string | null
  basePrice: number
  serviceFee: number
  totalPrice: number
  paymentStatus: PaymentStatus
  paymentLinkId: string | null
  paymentLinkUrl: string | null
  disclaimerAccepted: boolean
  disclaimerAcceptedAt: string | null
  disclaimerVersion: string | null
  createdAt: string
  updatedAt: string
}

export interface Review {
  id: string
  bookingId: string
  userId: string
  technicianId: string
  rating: number
  comment: string
  createdAt: string
  updatedAt: string | null
}

export interface PaymentLink {
  preferenceId: string
  initPoint: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface PricingBreakdown {
  basePrice: number
  serviceFee: number
  totalPrice: number
  feePercentage: number
}
