// ScooterBooster — TypeScript Type Definitions

export interface User {
  uid: string
  displayName: string
  email: string
  photoURL: string | null
  role: "user" | "technician" | "admin"
  phone: string | null
  whatsappConsent?: boolean
  deletedAt?: string | null
  scheduledDeletionAt?: string | null
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
  applicationStatus?: "pending" | "approved" | "request_changes" | "rejected"
  moderationReason?: string | null
  moderatedAt?: string | null
  normalizedLocation?: string
  searchTokens?: string[]
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
  searchTokens?: string[]
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
  searchTokens?: string[]
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
  searchTokens?: string[]
  createdAt: string
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled_by_user"
  | "cancelled_by_technician"
  | "expired"

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
  paymentId: string | null
  paymentLinkId: string | null
  paymentLinkUrl: string | null
  disclaimerAccepted: boolean
  disclaimerAcceptedAt: string | null
  disclaimerVersion: string | null
  refundedAt?: string | null
  reminderSentAt?: string | null
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
  isHidden?: boolean
  moderatedAt?: string | null
  moderatedBy?: string | null
  technicianReply: string | null
  technicianRepliedAt: string | null
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

export type NotificationType =
  | "booking_pending_payment"
  | "booking_confirmed"
  | "booking_reminder"
  | "booking_in_progress"
  | "booking_completed"
  | "booking_cancelled"

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  href: string | null
  readAt: string | null
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  action: string
  actorUid: string | null
  targetType: string
  targetId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}
