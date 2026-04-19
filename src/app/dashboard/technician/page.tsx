import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/session"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { getBookingsByTechnician } from "@/lib/db/bookings"
import { CalendarDays, Star, DollarSign, Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n)
}

export default async function TechnicianOverviewPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/technician")
  if (session.role !== "technician" && session.role !== "admin") redirect("/dashboard")

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) redirect("/onboarding")

  const allBookings = await getBookingsByTechnician(tech.id)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const todayBookings = allBookings.filter((b) => {
    const d = new Date(b.scheduledDate)
    return (
      d >= todayStart &&
      d < new Date(todayStart.getTime() + 86400000) &&
      (b.status === "confirmed" || b.status === "in_progress" || b.status === "pending")
    )
  })

  const pendingCount = allBookings.filter((b) => b.status === "pending").length

  const weekEarnings = allBookings
    .filter((b) => b.status === "completed" && new Date(b.updatedAt) >= weekStart)
    .reduce((sum, b) => sum + b.basePrice, 0)

  const upcoming = allBookings
    .filter(
      (b) =>
        (b.status === "confirmed" || b.status === "in_progress") &&
        new Date(b.scheduledDate) >= now,
    )
    .slice(0, 3)

  const kpis = [
    {
      label: "Reservas hoy",
      value: todayBookings.length.toString(),
      icon: CalendarDays,
      color: "text-[#1d4ed8]",
      bg: "bg-blue-50",
    },
    {
      label: "Solicitudes pendientes",
      value: pendingCount.toString(),
      icon: Clock,
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "Ganancias esta semana",
      value: formatPrice(weekEarnings),
      icon: DollarSign,
      color: "text-[#059669]",
      bg: "bg-[#d1fae5]",
    },
    {
      label: "Calificación promedio",
      value: tech.reviewCount > 0 ? `${tech.rating.toFixed(1)} ★` : "Sin reseñas",
      icon: Star,
      color: "text-[#d97706]",
      bg: "bg-amber-50",
    },
  ]

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">
          Hola, {tech.displayName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          {tech.isActive
            ? "Tu perfil está activo y visible en el catálogo."
            : "Tu perfil está en pausa — no aparecés en el catálogo."}
        </p>
        {!tech.isActive && (
          <Link
            href="/dashboard/technician/availability"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#10b981] hover:underline"
          >
            Activar perfil <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* KPI grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm"
          >
            <div
              className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${kpi.bg}`}
            >
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <p className="text-2xl font-bold text-[#111827]">{kpi.value}</p>
            <p className="mt-0.5 text-xs text-[#6b7280]">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Upcoming bookings */}
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[#111827]">Próximas reservas</h2>
          <Button variant="ghost" size="sm" asChild className="text-[#6b7280]">
            <Link href="/dashboard/technician/bookings">Ver todas →</Link>
          </Button>
        </div>

        {upcoming.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#9ca3af]">
            No tenés reservas próximas confirmadas.
          </p>
        ) : (
          <div className="divide-y divide-[#f3f4f6]">
            {upcoming.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-[#111827]">
                    {new Date(b.scheduledDate).toLocaleDateString("es-UY", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-[#6b7280]">{formatPrice(b.basePrice)} base</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/booking/${b.id}`}>Ver</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { href: "/dashboard/technician/profile", label: "Perfil profesional" },
          { href: "/dashboard/technician/bookings", label: "Gestionar reservas" },
          { href: "/dashboard/technician/availability", label: "Mi disponibilidad" },
          { href: "/dashboard/technician/services", label: "Servicios y precios" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-medium text-[#374151] shadow-sm transition-colors duration-150 hover:border-[#10b981] hover:text-[#059669]"
          >
            {link.label}
            <ArrowRight className="h-4 w-4 shrink-0 text-[#9ca3af]" />
          </Link>
        ))}
      </div>
    </section>
  )
}
