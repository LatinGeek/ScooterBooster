import type { Metadata } from "next"
import "@fontsource-variable/inter"
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
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
