import type { Metadata } from "next"
import "@fontsource-variable/inter"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from "sonner"
import "./globals.css"
import { AuthProvider } from "@/providers/auth-provider"

export const metadata: Metadata = {
  metadataBase: new URL("https://scooterbooster.uy"),
  title: {
    default: "ScooterBooster — Potenciá tu scooter",
    template: "%s | ScooterBooster",
  },
  description:
    "Conectamos dueños de scooters eléctricos con los mejores técnicos de Uruguay. Eliminación de límite de velocidad, firmware, cruise control y mantenimiento.",
  keywords: ["scooter eléctrico", "Uruguay", "técnicos", "mantenimiento", "firmware", "velocidad"],
  authors: [{ name: "ScooterBooster", url: "https://scooterbooster.uy" }],
  openGraph: {
    title: "ScooterBooster — Potenciá tu scooter",
    description: "Conectamos dueños de scooters eléctricos con los mejores técnicos de Uruguay.",
    url: "https://scooterbooster.uy",
    siteName: "ScooterBooster",
    locale: "es_UY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScooterBooster — Potenciá tu scooter",
    description: "Conectamos dueños de scooters eléctricos con los mejores técnicos de Uruguay.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isVercelDeployment = process.env.VERCEL === "1"

  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "font-sans text-sm",
              success: "border-emerald-200 bg-emerald-50 text-emerald-900",
              error: "border-red-200 bg-red-50 text-red-900",
            },
          }}
        />
        {isVercelDeployment ? <Analytics /> : null}
        {isVercelDeployment ? <SpeedInsights /> : null}
      </body>
    </html>
  )
}
