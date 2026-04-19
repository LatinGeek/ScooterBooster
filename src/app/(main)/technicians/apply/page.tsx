import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Bike, ShieldCheck, Sparkles } from "lucide-react"
import { getSession } from "@/lib/session"
import { adminDb } from "@/lib/firebase-admin"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { getActiveBrands } from "@/lib/db/brands"
import { getActiveServices } from "@/lib/db/services"
import { ApplyForm } from "./apply-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Postulate como tecnico - ScooterBooster",
  description:
    "Envia tu postulacion como tecnico verificado de ScooterBooster y aparece en el catalogo de servicios para scooters electricos en Uruguay.",
}

export default async function TechnicianApplyPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/technicians/apply")
  if (session.role === "technician") redirect("/dashboard/technician")
  if (session.role === "admin") redirect("/admin")

  const [userSnap, existingApplication, services, brands] = await Promise.all([
    adminDb.collection("users").doc(session.uid).get(),
    getTechnicianByUserId(session.uid),
    getActiveServices(),
    getActiveBrands(),
  ])

  if (!userSnap.exists) {
    redirect("/onboarding")
  }

  const userData = userSnap.data() as {
    displayName?: string
    phone?: string | null
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-8 rounded-[2rem] border border-[#e5e7eb] bg-[linear-gradient(135deg,#ecfdf5,white_60%,#f8fafc)] p-8 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-[#10b981] uppercase shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              Postulacion tecnica
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#111827]">
              Sumate como tecnico verificado
            </h1>
            <p className="mt-4 text-base leading-7 text-[#4b5563]">
              Si ya ayudas a dueños de scooters con mantenimiento, firmware o ajustes, aca podemos
              dejar tu perfil listo para que el equipo admin lo revise y te active en el
              marketplace.
            </p>
          </div>

          <div className="grid gap-3 rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-2xl bg-[#f8fafc] p-4">
              <Bike className="h-5 w-5 text-[#10b981]" />
              <p className="mt-3 text-sm font-semibold text-[#111827]">Especialidad clara</p>
              <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                Servicios, marcas y zona bien definidos.
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8fafc] p-4">
              <Sparkles className="h-5 w-5 text-[#10b981]" />
              <p className="mt-3 text-sm font-semibold text-[#111827]">Revision rapida</p>
              <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                Admin puede aprobarte desde el panel.
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8fafc] p-4">
              <ShieldCheck className="h-5 w-5 text-[#10b981]" />
              <p className="mt-3 text-sm font-semibold text-[#111827]">Perfil listo</p>
              <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                Ya queda preparado para recibir reservas.
              </p>
            </div>
          </div>
        </div>
      </section>

      <ApplyForm
        services={services}
        brands={brands}
        existingApplication={existingApplication}
        userProfile={{
          displayName: userData.displayName?.trim() || session.name || "Usuario ScooterBooster",
          phone: userData.phone ?? null,
        }}
      />
    </main>
  )
}
