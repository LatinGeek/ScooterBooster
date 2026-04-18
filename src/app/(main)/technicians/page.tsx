import type { Metadata } from "next"
import Link from "next/link"
import { ShieldCheck, ChevronRight } from "lucide-react"
import { getActiveTechnicians } from "@/lib/db/technicians"
import { TechnicianCard } from "@/components/technician-card"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Técnicos — ScooterBooster",
  description:
    "Encontrá técnicos verificados para tu scooter eléctrico en Uruguay. Especialistas en Xiaomi, Segway, Dualtron, Kaabo, VSETT, Zero e Inokim.",
}

export default async function TechniciansPage() {
  const technicians = await getActiveTechnicians({ sortBy: "rating" })

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#f0fdf4] to-white px-4 py-14 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#111827] md:text-5xl">
          Técnicos Verificados
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-[#6b7280]">
          Todos nuestros técnicos pasan por un proceso de verificación. Trabajá con los mejores
          profesionales de scooters eléctricos en Uruguay.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[#10b981]">
          <ShieldCheck className="h-5 w-5" />
          <span className="font-semibold">{technicians.length} técnicos activos</span>
        </div>
      </section>

      {/* Technicians grid */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        {technicians.length === 0 ? (
          <div className="py-20 text-center text-[#9ca3af]">
            No hay técnicos disponibles en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {technicians.map((tech) => (
              <TechnicianCard key={tech.id} technician={tech} />
            ))}
          </div>
        )}
      </section>

      {/* Are you a technician? */}
      <section className="border-t border-[#e5e7eb] bg-[#f9fafb] px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-[#111827]">¿Sos técnico de scooters?</h2>
        <p className="mt-2 text-[#6b7280]">
          Unite a nuestra red de técnicos verificados y recibí reservas directamente.
        </p>
        <Link
          href="/technicians/apply"
          className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#10b981] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#059669]"
        >
          Aplicar como técnico
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  )
}
