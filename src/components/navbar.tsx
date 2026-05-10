"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { AdminViewSwitcher } from "@/components/admin-view-switcher"
import { useAuth } from "@/hooks/use-auth"
import { NotificationBell } from "@/components/notification-bell"
import { Button } from "@/components/ui/button"
import { GlobalSearchBox } from "@/components/global-search-box"
import { BrandLogo } from "@/components/brand-logo"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, role, loading } = useAuth()

  const links = [
    { href: "/scooters", label: "Scooters" },
    { href: "/services", label: "Servicios" },
    { href: "/technicians", label: "Técnicos" },
  ]

  const dashboardHref =
    role === "technician" ? "/dashboard/technician" : role === "admin" ? "/admin" : "/dashboard"

  const desktopAuthActions = loading ? (
    <>
      <div className="h-9 w-28 animate-pulse rounded-md bg-[#f3f4f6]" />
      <div className="h-9 w-32 animate-pulse rounded-md bg-[#d1fae5]" />
    </>
  ) : user ? (
    <>
      <AdminViewSwitcher />
      <NotificationBell />
      <Button variant="ghost" size="sm" asChild>
        <Link href={dashboardHref}>Mi panel</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/booking">Reservar ahora</Link>
      </Button>
    </>
  ) : (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login">Iniciar sesión</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/booking">Reservar ahora</Link>
      </Button>
    </>
  )

  const mobileAuthActions = loading ? (
    <div className="space-y-2">
      <div className="h-10 animate-pulse rounded-xl bg-[#f3f4f6]" />
      <div className="h-10 animate-pulse rounded-xl bg-[#d1fae5]" />
    </div>
  ) : user ? (
    <>
      <AdminViewSwitcher compact className="self-start" />
      <div className="flex items-center justify-between rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2">
        <span className="text-sm font-medium text-[#374151]">Notificaciones</span>
        <NotificationBell className="h-9 w-9" />
      </div>
      <Button variant="secondary" asChild>
        <Link href={dashboardHref} onClick={() => setMobileOpen(false)}>
          Mi panel
        </Link>
      </Button>
      <Button asChild>
        <Link href="/booking" onClick={() => setMobileOpen(false)}>
          Reservar ahora
        </Link>
      </Button>
    </>
  ) : (
    <>
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
    </>
  )

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e5e7eb] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <BrandLogo
            className="shrink-0"
            imageClassName="h-9 w-9"
            textClassName="text-base sm:text-lg"
          />

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

          <div className="hidden flex-1 px-4 lg:block">
            <GlobalSearchBox
              inputId="navbar-search"
              wrapperClassName="relative"
              className="w-full"
              inputClassName="flex h-11 items-center gap-2 rounded-full border border-[#d1d5db] bg-[#f8fafc] px-4 shadow-sm"
              panelClassName="absolute left-0 right-0 mt-3 rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-xl shadow-slate-200/60"
            />
          </div>

          <div className="hidden items-center gap-3 md:flex">{desktopAuthActions}</div>

          <button
            className="cursor-pointer p-2 text-[#6b7280] transition-colors duration-200 hover:text-[#111827] md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen ? (
          <div className="flex flex-col gap-4 border-t border-[#e5e7eb] py-4 md:hidden">
            <GlobalSearchBox
              inputId="mobile-search"
              compact
              wrapperClassName="relative"
              className="w-full"
              inputClassName="flex h-11 items-center gap-2 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-4"
              panelClassName="mt-3 rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-lg"
              onNavigate={() => setMobileOpen(false)}
            />

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

            <div className="flex flex-col gap-2 border-t border-[#e5e7eb] pt-2">{mobileAuthActions}</div>
          </div>
        ) : null}
      </div>
    </header>
  )
}
