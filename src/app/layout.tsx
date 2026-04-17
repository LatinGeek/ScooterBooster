import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScooterBooster — Potenciá tu scooter",
  description:
    "Conectamos dueños de scooters eléctricos con los mejores técnicos de Uruguay. Eliminación de límite de velocidad, firmware, cruise control y mantenimiento.",
  keywords: [
    "scooter eléctrico",
    "Uruguay",
    "técnicos",
    "mantenimiento",
    "firmware",
    "velocidad",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
