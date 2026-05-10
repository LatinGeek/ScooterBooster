import { adminDb } from "@/lib/firebase-admin"

export type TrendPoint = {
  date: string
  label: string
  bookings: number
  gmv: number
}

export type BookingStatusCounts = {
  pending: number
  confirmed: number
  in_progress: number
  completed: number
  cancelled: number
  expired: number
}

export type AdminOverviewSnapshot = {
  totalUsers: number
  totalReviews: number
  approvedTechs: number
  pendingTechs: number
  bookingStatusCounts: BookingStatusCounts
  trends: TrendPoint[]
  totalGMV: number
  totalPlatformRevenue: number
  activeBookings: number
}

type BookingRow = Record<string, unknown>

function toIsoDay(input: Date) {
  return input.toISOString().slice(0, 10)
}

function buildTrendSeed(days: number) {
  const today = new Date()
  const seed = new Map<string, TrendPoint>()

  for (let index = days - 1; index >= 0; index--) {
    const current = new Date(today)
    current.setHours(0, 0, 0, 0)
    current.setDate(current.getDate() - index)
    const key = toIsoDay(current)

    seed.set(key, {
      date: key,
      label: current.toLocaleDateString("es-UY", {
        day: "numeric",
        month: "short",
      }),
      bookings: 0,
      gmv: 0,
    })
  }

  return seed
}

function extractBookingDate(createdAtRaw: unknown): string | null {
  if (typeof createdAtRaw === "string") {
    return createdAtRaw.slice(0, 10)
  }

  if (createdAtRaw && typeof (createdAtRaw as { toDate?: () => Date }).toDate === "function") {
    try {
      return (createdAtRaw as { toDate: () => Date }).toDate().toISOString().slice(0, 10)
    } catch {
      console.warn("Failed to parse booking Timestamp", createdAtRaw)
      return null
    }
  }

  if (createdAtRaw instanceof Date) {
    return createdAtRaw.toISOString().slice(0, 10)
  }

  console.warn("Unknown booking createdAt format", createdAtRaw)
  return null
}

function withTimeout<T>(label: string, promise: Promise<T>, fallback: T, timeoutMs = 5000): Promise<T> {
  let timer: NodeJS.Timeout | undefined

  const guarded = promise
    .then((value) => value)
    .catch((error) => {
      console.warn(`Admin overview ${label} failed`, error)
      return fallback
    })

  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`Admin overview ${label} timed out after ${timeoutMs}ms`)
      resolve(fallback)
    }, timeoutMs)
  })

  return Promise.race([guarded, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

async function countDocuments(
  label: string,
  query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>,
  fallback = 0,
): Promise<number> {
  return withTimeout(
    label,
    (async () => {
      const snapshot = await query.count().get()
      return (snapshot.data().count as number | undefined) ?? fallback
    })(),
    fallback,
  )
}

async function loadRows(
  label: string,
  query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>,
  fallback: BookingRow[] = [],
): Promise<BookingRow[]> {
  return withTimeout(
    label,
    (async () => {
      const snapshot = await query.get()
      return snapshot.docs.map((doc: { data: () => BookingRow }) => doc.data())
    })(),
    fallback,
  )
}

export async function getAdminOverviewSnapshot(): Promise<AdminOverviewSnapshot> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setHours(0, 0, 0, 0)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()

  const [
    totalUsers,
    totalReviews,
    approvedTechs,
    pendingTechs,
    pendingBookings,
    confirmedBookings,
    inProgressBookings,
    completedBookings,
    cancelledBookings,
    expiredBookings,
    recentBookings,
    completedBookingRows,
  ] = await Promise.all([
    countDocuments("users", adminDb.collection("users")),
    countDocuments("reviews", adminDb.collection("reviews")),
    countDocuments("approved technicians", adminDb.collection("technicians").where("isApproved", "==", true)),
    countDocuments("pending technicians", adminDb.collection("technicians").where("isApproved", "==", false)),
    countDocuments("pending bookings", adminDb.collection("bookings").where("status", "==", "pending")),
    countDocuments("confirmed bookings", adminDb.collection("bookings").where("status", "==", "confirmed")),
    countDocuments("in-progress bookings", adminDb.collection("bookings").where("status", "==", "in_progress")),
    countDocuments("completed bookings", adminDb.collection("bookings").where("status", "==", "completed")),
    countDocuments("cancelled bookings", adminDb.collection("bookings").where("status", "==", "cancelled")),
    countDocuments("expired bookings", adminDb.collection("bookings").where("status", "==", "expired")),
    loadRows(
      "recent bookings",
      adminDb
        .collection("bookings")
        .where("createdAt", ">=", thirtyDaysAgoIso)
        .orderBy("createdAt", "desc")
        .limit(500),
    ),
    loadRows(
      "completed booking rows",
      adminDb.collection("bookings").where("status", "==", "completed").limit(500),
    ),
  ])

  const bookingStatusCounts = {
    pending: pendingBookings,
    confirmed: confirmedBookings,
    in_progress: inProgressBookings,
    completed: completedBookings,
    cancelled: cancelledBookings,
    expired: expiredBookings,
  }

  const trends = buildTrendSeed(30)
  let totalGMV = 0
  let totalPlatformRevenue = 0

  for (const row of recentBookings) {
    const totalPrice = (row["totalPrice"] as number) ?? 0

    const createdAt = extractBookingDate(row["createdAt"])
    if (createdAt) {
      const trend = trends.get(createdAt)
      if (trend) {
        trend.bookings += 1
        trend.gmv += totalPrice
      }
    }
  }

  for (const row of completedBookingRows) {
    const totalPrice = (row["totalPrice"] as number) ?? 0
    totalGMV += totalPrice
    totalPlatformRevenue += (row["serviceFee"] as number) ?? 0
  }

  return {
    totalUsers,
    totalReviews,
    approvedTechs,
    pendingTechs,
    bookingStatusCounts,
    trends: [...trends.values()],
    totalGMV,
    totalPlatformRevenue,
    activeBookings: pendingBookings + confirmedBookings + inProgressBookings,
  }
}
