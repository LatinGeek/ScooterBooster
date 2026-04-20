"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, CalendarDays, UserCircle, LogOut, Bike } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { NotificationBell } from "@/components/notification-bell"
import { useRouter } from "next/navigation"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Mis reservas", icon: CalendarDays, exact: true },
  { href: "/dashboard/notifications", label: "Notificaciones", icon: Bell, exact: false },
  { href: "/dashboard/profile", label: "Perfil", icon: UserCircle, exact: false },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
      {/* ── Desktop layout ─────────────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-24">
            {/* Brand */}
            <Link
              href="/"
              className="mb-6 flex items-center gap-2 font-bold text-[#111827] transition-colors duration-150 hover:text-[#10b981]"
            >
              <Bike className="h-5 w-5 text-[#10b981]" />
              <span className="text-base">ScooterBooster</span>
            </Link>

            {/* User info */}
            {user && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d1fae5] text-[#059669] font-semibold">
                    {user.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111827]">
                    {user.displayName}
                  </p>
                  <p className="truncate text-xs text-[#6b7280]">{user.email}</p>
                </div>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white p-3">
              <div>
                <p className="text-sm font-semibold text-[#111827]">Centro de actividad</p>
                <p className="text-xs text-[#6b7280]">Avisos sobre reservas y pagos</p>
              </div>
              <NotificationBell />
            </div>

            {/* Nav links */}
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                      active
                        ? "bg-[#d1fae5] text-[#059669]"
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
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#6b7280] transition-colors duration-150 hover:bg-red-50 hover:text-red-600 mt-2"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Cerrar sesión
              </button>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
      </div>

      {/* ── Mobile tab bar ──────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5e7eb] bg-white md:hidden">
        <div className="flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 cursor-pointer flex-col items-center gap-1 py-3 text-xs font-medium transition-colors duration-150 ${
                  active ? "text-[#10b981]" : "text-[#9ca3af]"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
          <button
            onClick={handleSignOut}
            className="flex flex-1 cursor-pointer flex-col items-center gap-1 py-3 text-xs font-medium text-[#9ca3af] transition-colors duration-150 hover:text-red-500"
          >
            <LogOut className="h-5 w-5" />
            Salir
          </button>
        </div>
      </nav>
    </div>
  )
}
