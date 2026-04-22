import Link from "next/link"
import { redirect } from "next/navigation"
import { Activity, ArrowRight, CalendarDays, Clock, DollarSign, Star, Users, Wrench } from "lucide-react"
import { AdminOverviewCharts } from "./overview-charts"
import { getAllTechnicians } from "@/lib/db/technicians"
import { adminDb } from "@/lib/firebase-admin"
import { getSession } from "@/lib/session"

type TrendPoint = {
  date: string
  label: string
  bookings: number
  gmv: number
}

export const dynamic = "force-dynamic"

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n)
}

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

export default async function AdminOverviewPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin")
  if (session.role !== "admin") redirect("/")

  const [usersSnap, bookingsSnap, reviewsSnap, technicians] = await Promise.all([
    adminDb.collection("users").get(),
    adminDb.collection("bookings").get(),
    adminDb.collection("reviews").get(),
    getAllTechnicians(),
  ])

  const totalUsers = usersSnap.size
  const approvedTechs = technicians.filter((technician) => technician.isApproved).length
  const pendingTechs = technicians.filter((technician) => !technician.isApproved).length

  const bookingStatusCounts = {
    pending: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    expired: 0,
  }

  const trends = buildTrendSeed(30)

  let totalGMV = 0
  let platformRevenue = 0
  let completedBookings = 0
  let activeBookings = 0

  for (const doc of bookingsSnap.docs) {
    const data = doc.data()
    const status = (data["status"] as string | undefined) ?? "pending"
    const totalPrice = (data["totalPrice"] as number) ?? 0
    const serviceFee = (data["serviceFee"] as number) ?? 0
    const createdAtRaw = data["createdAt"]
    const createdAt =
      typeof createdAtRaw === "string"
        ? createdAtRaw
        : typeof (createdAtRaw as FirebaseFirestore.Timestamp | undefined)?.toDate === "function"
          ? (createdAtRaw as FirebaseFirestore.Timestamp).toDate().toISOString()
          : null

    if (status === "completed") {
      completedBookings++
      totalGMV += totalPrice
      platformRevenue += serviceFee
    }

    if (status === "pending" || status === "confirmed" || status === "in_progress") {
      activeBookings++
    }

    if (status === "pending") bookingStatusCounts.pending++
    else if (status === "confirmed") bookingStatusCounts.confirmed++
    else if (status === "in_progress") bookingStatusCounts.in_progress++
    else if (status === "completed") bookingStatusCounts.completed++
    else if (status === "expired") bookingStatusCounts.expired++
    else bookingStatusCounts.cancelled++

    if (createdAt) {
      const trend = trends.get(createdAt.slice(0, 10))
      if (trend) {
        trend.bookings += 1
        trend.gmv += totalPrice
      }
    }
  }

  const kpis = [
    {
      label: "Usuarios registrados",
      value: totalUsers.toString(),
      icon: Users,
      color: "text-[#1d4ed8]",
      bg: "bg-blue-50",
    },
    {
      label: "Técnicos aprobados",
      value: approvedTechs.toString(),
      icon: Wrench,
      color: "text-[#059669]",
      bg: "bg-[#d1fae5]",
    },
    {
      label: "Técnicos pendientes",
      value: pendingTechs.toString(),
      icon: Clock,
      color: "text-amber-700",
      bg: "bg-amber-50",
      alert: pendingTechs > 0,
    },
    {
      label: "Reservas completadas",
      value: completedBookings.toString(),
      icon: CalendarDays,
      color: "text-[#1d4ed8]",
      bg: "bg-blue-50",
    },
    {
      label: "GMV total",
      value: formatPrice(totalGMV),
      icon: DollarSign,
      color: "text-[#059669]",
      bg: "bg-[#d1fae5]",
    },
    {
      label: "Comisiones cobradas",
      value: formatPrice(platformRevenue),
      icon: DollarSign,
      color: "text-[#d97706]",
      bg: "bg-amber-50",
    },
    {
      label: "Reservas activas",
      value: activeBookings.toString(),
      icon: CalendarDays,
      color: "text-[#1d4ed8]",
      bg: "bg-blue-50",
    },
    {
      label: "Reseñas totales",
      value: reviewsSnap.size.toString(),
      icon: Star,
      color: "text-[#d97706]",
      bg: "bg-amber-50",
    },
  ]

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Panel de administración</h1>
        <p className="mt-1 text-sm text-[#6b7280]">Métricas generales y tendencia reciente de la plataforma.</p>
      </div>

      {pendingTechs > 0 ? (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              {pendingTechs} técnico{pendingTechs !== 1 ? "s" : ""} esperando aprobación
            </span>
          </div>
          <Link
            href="/admin/technicians"
            className="flex items-center gap-1 text-sm font-semibold text-amber-700 hover:underline"
          >
            Revisar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-2xl border bg-white p-5 shadow-sm ${
              kpi.alert ? "border-amber-200" : "border-[#e5e7eb]"
            }`}
          >
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${kpi.bg}`}>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <p className="text-2xl font-bold text-[#111827]">{kpi.value}</p>
            <p className="mt-0.5 text-xs text-[#6b7280]">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <AdminOverviewCharts
          trends={[...trends.values()]}
          bookingStatusCounts={bookingStatusCounts}
          totalGMV={totalGMV}
          totalPlatformRevenue={platformRevenue}
        />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { href: "/admin/technicians", label: "Gestionar técnicos" },
          { href: "/admin/users", label: "Gestionar usuarios" },
          { href: "/admin/bookings", label: "Gestionar reservas" },
          { href: "/admin/scooters", label: "Gestionar scooters" },
          { href: "/admin/services", label: "Gestionar servicios" },
          { href: "/admin/reviews", label: "Moderar reseñas" },
          { href: "/admin/audit", label: "Ver auditoría", icon: Activity },
          { href: "/admin/observability", label: "Observabilidad", icon: Activity },
          { href: "/admin/settings", label: "Configuración" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-medium text-[#374151] shadow-sm transition-colors duration-150 hover:border-amber-300 hover:text-amber-700"
          >
            <span className="flex items-center gap-2">
              {link.icon ? <link.icon className="h-4 w-4" /> : null}
              {link.label}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#9ca3af]" />
          </Link>
        ))}
      </div>
    </section>
  )
}

