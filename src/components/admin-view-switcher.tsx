"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

interface AdminViewSwitcherProps {
  className?: string
  compact?: boolean
}

export function AdminViewSwitcher({ className, compact = false }: AdminViewSwitcherProps) {
  const pathname = usePathname()
  const { role, loading } = useAuth()

  if (loading || role !== "admin" || !pathname.startsWith("/dashboard")) return null

  const activeView = "customer"
  const links = [
    { href: "/dashboard", label: "Cliente", key: "customer" as const },
    { href: "/admin", label: "Admin", key: "admin" as const },
  ]

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[#e5e7eb] bg-white p-1 shadow-sm",
        compact ? "gap-1" : "gap-1.5",
        className,
      )}
      aria-label="Cambiar vista de panel"
    >
      {links.map((link) => {
        const active = activeView === link.key
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-[#111827] text-white" : "text-[#6b7280] hover:text-[#111827]",
              compact && "px-2.5 py-1 text-xs",
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
