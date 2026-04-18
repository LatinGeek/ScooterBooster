import type { Metadata } from "next"
import Link from "next/link"
import { FileText, Shield, HelpCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Legal",
  description: "Términos de uso, política de privacidad y preguntas frecuentes de ScooterBooster.",
}

export default function LegalIndexPage() {
  const docs = [
    {
      href: "/legal/terms",
      icon: FileText,
      title: "Términos y Condiciones",
      desc: "Reglas de uso de la plataforma, responsabilidades y condiciones del servicio.",
    },
    {
      href: "/legal/privacy",
      icon: Shield,
      title: "Política de Privacidad",
      desc: "Cómo recopilamos, usamos y protegemos tus datos personales (Ley 18.331).",
    },
    {
      href: "/legal/faq",
      icon: HelpCircle,
      title: "Preguntas Frecuentes",
      desc: "Respuestas a las dudas más comunes sobre reservas, pagos y servicios.",
    },
  ]

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold text-[#111827]">Legal</h1>
      <p className="mb-10 text-[#6b7280]">
        Toda la información legal y reglamentaria de ScooterBooster.
      </p>
      <div className="flex flex-col gap-4">
        {docs.map((doc) => (
          <Link
            key={doc.href}
            href={doc.href}
            className="flex cursor-pointer items-start gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3f4f6]">
              <doc.icon className="h-5 w-5 text-[#6b7280]" />
            </div>
            <div>
              <p className="font-semibold text-[#111827]">{doc.title}</p>
              <p className="mt-0.5 text-sm text-[#6b7280]">{doc.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
