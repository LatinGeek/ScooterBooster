"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"

function getErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined
  const code = (err as { code?: unknown }).code
  return typeof code === "string" && code.trim() ? code : undefined
}

function getErrorStage(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined
  const stage = (err as { stage?: unknown }).stage
  return typeof stage === "string" && stage.trim() ? stage : undefined
}

function getErrorMessage(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined
  const message = (err as { message?: unknown }).message
  return typeof message === "string" && message.trim() ? message : undefined
}

function reportLoginError(err: unknown) {
  if (typeof window === "undefined") return

  void fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope: "login",
      code: getErrorCode(err),
      stage: getErrorStage(err),
      message: getErrorMessage(err),
    }),
    keepalive: true,
  }).catch(() => {})
}

function LoginForm() {
  const { signInWithGoogle } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      const redirect = searchParams.get("redirect") ?? "/"
      const safeRedirect = redirect.startsWith("/") ? redirect : "/"
      router.replace(safeRedirect)
      router.refresh()
    } catch (err) {
      console.error("Login failed", err)
      reportLoginError(err)
      setError("No se pudo iniciar sesión. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white px-8 py-10 shadow-sm">
      <h2 className="mb-2 text-center text-xl font-semibold text-[#111827]">Bienvenido</h2>
      <p className="mb-8 text-center text-sm text-[#6b7280]">
        Iniciá sesión para acceder a tu cuenta
      </p>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-[#e5e7eb] bg-white px-6 py-3 text-sm font-semibold text-[#374151] shadow-sm transition-all duration-200 hover:bg-[#f9fafb] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#10b981] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {loading ? "Iniciando sesión..." : "Continuar con Google"}
      </button>

      <p className="mt-6 text-center text-xs text-[#9ca3af]">
        Al continuar, aceptás nuestros{" "}
        <a href="/legal/terms" className="cursor-pointer text-[#10b981] hover:underline">
          Términos y condiciones
        </a>{" "}
        y{" "}
        <a href="/legal/privacy" className="cursor-pointer text-[#10b981] hover:underline">
          Política de privacidad
        </a>
        .
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f9fafb] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e7eb]">
            <Image
              src="/assets/scooterbooster-logo.png"
              alt="ScooterBooster logo"
              width={40}
              height={40}
              className="h-10 w-10"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#111827]">ScooterBooster</h1>
            <p className="mt-1 text-sm text-[#6b7280]">Potenciá tu scooter eléctrico</p>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-[#e5e7eb] bg-white px-8 py-10 shadow-sm">
              <div className="flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#10b981] border-t-transparent" />
              </div>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
