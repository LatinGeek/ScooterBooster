import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import {
  MapPin,
  Star,
  ChevronLeft,
  CheckCircle,
  Gauge,
  Cpu,
  Navigation,
  Wrench,
  Clock,
} from "lucide-react"
import { getTechnicianById } from "@/lib/db/technicians"
import { getReviewsByTechnician } from "@/lib/db/reviews"
import { getServicesByIds } from "@/lib/db/services"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ReviewCard } from "@/components/review-card"
import { WhatsAppButton } from "@/components/whatsapp-button"

export const dynamic = "force-dynamic"

const SERVICE_ICONS: Record<string, React.ElementType> = {
  "speed-limit": Gauge,
  firmware: Cpu,
  "cruise-control": Navigation,
  maintenance: Wrench,
}

const DAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
}

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const technician = await getTechnicianById(id)
  if (!technician) return { title: "Técnico no encontrado — ScooterBooster" }
  return {
    title: `${technician.displayName} — ScooterBooster`,
    description: `Técnico de scooters eléctricos en ${technician.location}. ${technician.bio}`,
  }
}

export default async function TechnicianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const technician = await getTechnicianById(id)
  if (!technician) notFound()

  const [reviews, services] = await Promise.all([
    getReviewsByTechnician(technician.id, 10),
    getServicesByIds(technician.services),
  ])

  const initials = technician.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link
          href="/technicians"
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[#6b7280] transition-colors hover:text-[#10b981]"
        >
          <ChevronLeft className="h-4 w-4" />
          Técnicos
        </Link>
      </nav>

      {/* Profile header */}
      <div className="mb-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Avatar className="h-24 w-24 flex-shrink-0">
          {technician.photoURL && (
            <AvatarImage src={technician.photoURL} alt={technician.displayName} />
          )}
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold text-[#111827]">{technician.displayName}</h1>
            <div className="flex items-center gap-1.5 rounded-full bg-[#f0fdf4] px-3 py-1 text-sm font-semibold text-[#10b981]">
              <CheckCircle className="h-4 w-4" />
              Verificado
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-[#6b7280]">
              <MapPin className="h-4 w-4" />
              {technician.location}
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-[#f59e0b] text-[#f59e0b]" />
              <span className="text-sm font-semibold text-[#111827]">
                {technician.rating.toFixed(1)}
              </span>
              <span className="text-sm text-[#9ca3af]">({technician.reviewCount} reseñas)</span>
            </div>
          </div>

          {technician.bio && <p className="mt-3 text-[#6b7280]">{technician.bio}</p>}
        </div>

        {/* WhatsApp CTA */}
        <div className="flex flex-col gap-2">
          <WhatsAppButton
            phoneNumber={technician.whatsappNumber}
            message={`Hola ${technician.displayName}, vi tu perfil en ScooterBooster y me gustaría consultar sobre tus servicios.`}
            variant="default"
          />
          <Link
            href={`/booking?technicianId=${technician.id}`}
            className="cursor-pointer rounded-lg bg-[#10b981] px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#059669]"
          >
            Reservar turno
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column: services + pricing */}
        <div className="space-y-8 lg:col-span-2">
          {/* Services */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-[#111827]">Servicios y precios</h2>
            <div className="space-y-3">
              {services.map((service) => {
                const Icon = SERVICE_ICONS[service.category] ?? Wrench
                const pricing = technician.pricing[service.id]
                return (
                  <div
                    key={service.id}
                    className="flex items-center gap-4 rounded-xl border border-[#e5e7eb] bg-white p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0fdf4]">
                      <Icon className="h-5 w-5 text-[#10b981]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#111827]">{service.name}</p>
                      <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                        <Clock className="h-3 w-3" />~{service.estimatedDuration} min
                      </div>
                    </div>
                    {pricing && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#10b981]">
                          ${pricing.basePrice.toLocaleString("es-UY")} UYU
                        </p>
                        <p className="text-xs text-[#9ca3af]">precio base</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Reviews */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-[#111827]">
              Reseñas{" "}
              <span className="text-base font-normal text-[#9ca3af]">({reviews.length})</span>
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-[#9ca3af]">Aún no hay reseñas para este técnico.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column: availability */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5">
            <h2 className="mb-4 text-base font-bold text-[#111827]">Disponibilidad semanal</h2>
            <ul className="space-y-2">
              {DAY_ORDER.map((day) => {
                const avail = technician.availability[day]
                return (
                  <li key={day} className="flex items-center justify-between text-sm">
                    <span className="text-[#374151]">{DAY_LABELS[day]}</span>
                    {avail?.isAvailable ? (
                      <span className="text-[#10b981]">
                        {avail.start} – {avail.end}
                      </span>
                    ) : (
                      <span className="text-[#9ca3af]">No disponible</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Supported brands */}
          {technician.supportedBrands.length > 0 && (
            <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5">
              <h2 className="mb-3 text-base font-bold text-[#111827]">Marcas soportadas</h2>
              <div className="flex flex-wrap gap-2">
                {technician.supportedBrands.map((brandId) => (
                  <Badge key={brandId} variant="secondary" className="capitalize">
                    {brandId.replace("brand-", "")}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
