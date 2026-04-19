import Link from "next/link"
import { Zap, ArrowLeft, Home } from "lucide-react"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      {/* Brand mark */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
        <Zap className="h-8 w-8 text-white" />
      </div>

      {/* 404 */}
      <p className="text-sm font-semibold uppercase tracking-widest text-emerald-500">Error 404</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
        Página no encontrada
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-gray-500">
        La página que estás buscando no existe o fue movida. Revisá la dirección o volvé al inicio.
      </p>

      {/* CTAs */}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white shadow-md shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400"
        >
          <Home className="h-4 w-4" />
          Ir al inicio
        </Link>
        <Link
          href="/services"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md"
        >
          <ArrowLeft className="h-4 w-4" />
          Ver servicios
        </Link>
      </div>
    </main>
  )
}
