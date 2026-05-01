"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Activity,
  BarChart3,
  Bike,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

const NAV_ITEMS = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/technicians", label: "Técnicos", icon: Wrench, exact: false },
  { href: "/admin/users", label: "Usuarios", icon: Users, exact: false },
  { href: "/admin/bookings", label: "Reservas", icon: CalendarDays, exact: false },
  { href: "/admin/scooters", label: "Scooters", icon: Bike, exact: false },
  { href: "/admin/services", label: "Servicios", icon: Wrench, exact: false },
  { href: "/admin/reviews", label: "Reseñas", icon: Activity, exact: false },
  { href: "/admin/audit", label: "Auditoría", icon: Activity, exact: false },
  { href: "/admin/observability", label: "Observabilidad", icon: BarChart3, exact: false },
  { href: "/admin/settings", label: "Configuración", icon: Settings, exact: false },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { signOut, user } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/")
  }

  function isActive(item: (typeof NAV_ITEMS)[number]) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-24">
            <Link
              href="/"
              className="mb-2 flex items-center gap-2 font-bold text-[#111827] transition-colors duration-150 hover:text-[#10b981]"
            >
              <Bike className="h-5 w-5 text-[#10b981]" />
              <span className="text-base">ScooterBooster</span>
            </Link>
            <div className="mb-6 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Panel Admin</span>
            </div>

            {user ? (
              <div className="mb-6 rounded-xl border border-[#e5e7eb] bg-white p-3">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName}
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-700">
                      {user.displayName?.charAt(0)?.toUpperCase() ?? "A"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#111827]">{user.displayName}</p>
                    <p className="truncate text-xs text-[#6b7280]">{user.email}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                      active
                        ? "bg-amber-50 text-amber-700"
                        : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
              <button
                onClick={handleSignOut}
                className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#6b7280] transition-colors duration-150 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Cerrar sesión
              </button>
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5e7eb] bg-white md:hidden">
        <div className="flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 cursor-pointer flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors duration-150 ${
                  active ? "text-amber-600" : "text-[#9ca3af]"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
          <button
            onClick={handleSignOut}
            className="flex flex-1 cursor-pointer flex-col items-center gap-1 py-2.5 text-xs font-medium text-[#9ca3af] hover:text-red-500"
          >
            <LogOut className="h-5 w-5" />
            Salir
          </button>
        </div>
      </nav>
    </div>
  )
}
