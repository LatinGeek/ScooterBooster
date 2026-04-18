"use client"

import Link from "next/link"
import { useState } from "react"
import { Bike, Menu, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = [
    { href: "/scooters", label: "Scooters" },
    { href: "/services", label: "Servicios" },
    { href: "/technicians", label: "Técnicos" },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e5e7eb] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-[#111827] transition-colors duration-200 hover:text-[#10b981]"
          >
            <Bike className="h-6 w-6 text-[#10b981]" />
            <span className="text-lg">ScooterBooster</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#6b7280] transition-colors duration-200 hover:text-[#111827]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <form action="/search" className="hidden flex-1 px-4 lg:block">
            <label className="sr-only" htmlFor="navbar-search">
              Buscar scooters, servicios o técnicos
            </label>
            <div className="flex h-11 items-center gap-2 rounded-full border border-[#d1d5db] bg-[#f8fafc] px-4 shadow-sm">
              <Search className="h-4 w-4 text-[#6b7280]" />
              <input
                id="navbar-search"
                name="q"
                type="search"
                placeholder="Buscar scooters, servicios o técnicos"
                className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
              />
            </div>
          </form>

          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/booking">Reservar ahora</Link>
            </Button>
          </div>

          <button
            className="cursor-pointer p-2 text-[#6b7280] transition-colors hover:text-[#111827] md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="flex flex-col gap-4 border-t border-[#e5e7eb] py-4 md:hidden">
            <form action="/search" className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-2">
              <label className="sr-only" htmlFor="mobile-search">
                Buscar scooters, servicios o técnicos
              </label>
              <div className="flex items-center gap-2 px-2">
                <Search className="h-4 w-4 text-[#6b7280]" />
                <input
                  id="mobile-search"
                  name="q"
                  type="search"
                  placeholder="Buscar"
                  className="h-10 w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
                />
              </div>
            </form>

            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#6b7280] transition-colors duration-200 hover:text-[#111827]"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <div className="flex flex-col gap-2 border-t border-[#e5e7eb] pt-2">
              <Button variant="secondary" asChild>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  Iniciar sesión
                </Link>
              </Button>
              <Button asChild>
                <Link href="/booking" onClick={() => setMobileOpen(false)}>
                  Reservar ahora
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
