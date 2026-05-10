import type { Metadata } from "next"
import { Inter, Poppins } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from "sonner"
import { AnalyticsProvider } from "@/components/analytics-provider"
import { CookieBanner } from "@/components/cookie-banner"
import "./globals.css"
import { AuthProvider } from "@/providers/auth-provider"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["700", "800"],
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://scooterbooster.uy"),
  title: {
    default: "ScooterBooster — Potenciá tu scooter",
    template: "%s | ScooterBooster",
  },
  description:
    "Conectamos dueños de scooters eléctricos con técnicos verificados de Uruguay. Deslimitación, firmware, control de crucero y mantenimiento.",
  keywords: ["scooter eléctrico", "Uruguay", "técnicos", "mantenimiento", "firmware", "velocidad"],
  authors: [{ name: "ScooterBooster", url: "https://scooterbooster.uy" }],
  openGraph: {
    title: "ScooterBooster — Potenciá tu scooter",
    description: "Conectamos dueños de scooters eléctricos con técnicos verificados de Uruguay.",
    url: "https://scooterbooster.uy",
    siteName: "ScooterBooster",
    locale: "es_UY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScooterBooster — Potenciá tu scooter",
    description: "Conectamos dueños de scooters eléctricos con técnicos verificados de Uruguay.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isVercelDeployment = process.env.VERCEL === "1"
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? null

  return (
    <html lang="es" className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AuthProvider>{children}</AuthProvider>
        <CookieBanner />
        <AnalyticsProvider measurementId={gaMeasurementId} />
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



