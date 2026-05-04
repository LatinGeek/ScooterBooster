"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Mail, Phone, Search, ShieldCheck, Trash2, User as UserIcon, UserCog, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { User } from "@/types"

interface Props {
  users: User[]
  currentAdminUid: string
}

type RoleFilter = "all" | User["role"]
type StateFilter = "all" | "active" | "deleted"

const roleIcon = {
  admin: ShieldCheck,
  technician: Wrench,
  user: UserIcon,
} satisfies Record<User["role"], React.ComponentType<{ className?: string }>>

const roleLabel: Record<User["role"], string> = {
  admin: "Admin",
  technician: "Tecnico",
  user: "Usuario",
}

const roleColors: Record<User["role"], string> = {
  admin: "bg-amber-50 text-amber-700",
  technician: "bg-emerald-50 text-emerald-700",
  user: "bg-slate-100 text-slate-600",
}

function formatDate(iso?: string | null) {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("es-UY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function AdminUsersClient({ users: initialUsers, currentAdminUid }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [stateFilter, setStateFilter] = useState<StateFilter>("all")
  const [selectedUid, setSelectedUid] = useState(initialUsers[0]?.uid ?? "")
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false

      const isDeleted = Boolean(user.deletedAt)
      if (stateFilter === "active" && isDeleted) return false
      if (stateFilter === "deleted" && !isDeleted) return false

      const haystack = [user.displayName, user.email, user.phone ?? "", user.uid].join(" ").toLowerCase()
      return haystack.includes(query.toLowerCase())
    })
  }, [query, roleFilter, stateFilter, users])

  const selectedUser = filteredUsers.find((user) => user.uid === selectedUid) ?? filteredUsers[0] ?? null

  useEffect(() => {
    if (filteredUsers.length === 0) {
      if (selectedUid) setSelectedUid("")
      return
    }

    if (!filteredUsers.some((user) => user.uid === selectedUid)) {
      setSelectedUid(filteredUsers[0]!.uid)
    }
  }, [filteredUsers, selectedUid])

  async function updateRole(user: User, role: User["role"]) {
    setBusyKey(`role-${user.uid}`)
    try {
      const response = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, role }),
      })
      const json = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast.error(json.error ?? "No pudimos actualizar el rol.")
        return
      }

      setUsers((current) => current.map((item) => (item.uid === user.uid ? { ...item, role } : item)))
      toast.success(`Rol actualizado a ${roleLabel[role].toLowerCase()}.`)
    } finally {
      setBusyKey(null)
    }
  }

  async function toggleDeleted(user: User, action: "soft_delete" | "restore") {
    setBusyKey(`${action}-${user.uid}`)
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, action }),
      })
      const json = (await response.json()) as { error?: string; data?: Partial<User> }
      if (!response.ok || !json.data) {
        toast.error(json.error ?? "No pudimos actualizar el estado del usuario.")
        return
      }

      setUsers((current) => current.map((item) => (item.uid === user.uid ? { ...item, ...json.data } : item)))
      toast.success(action === "soft_delete" ? "Usuario suspendido." : "Usuario restaurado.")
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Usuarios</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Busca perfiles, cambia roles y gestiona suspensiones sin salir del panel.
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
          <UserCog className="h-5 w-5 text-[#2563eb]" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, email o UID"
                className="pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
              className="h-10 rounded-xl border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
            >
              <option value="all">Todos los roles</option>
              <option value="user">Usuarios</option>
              <option value="technician">Tecnicos</option>
              <option value="admin">Admins</option>
            </select>
            <select
              value={stateFilter}
              onChange={(event) => setStateFilter(event.target.value as StateFilter)}
              className="h-10 rounded-xl border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="deleted">Suspendidos</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-[#f3f4f6] bg-[#fafafa]">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Usuario</th>
                  <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280] lg:table-cell">Contacto</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Rol</th>
                  <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280] md:table-cell">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {filteredUsers.map((user) => {
                  const RoleIcon = roleIcon[user.role]
                  const isDeleted = Boolean(user.deletedAt)
                  const isSelected = selectedUser?.uid === user.uid
                  return (
                    <tr
                      key={user.uid}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50/50" : "hover:bg-[#fafafa]"}`}
                      onClick={() => setSelectedUid(user.uid)}
                    >
                      <td className="px-5 py-3">
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
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f4f6] text-sm font-semibold text-[#6b7280]">
                              {user.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[#111827]">{user.displayName}</p>
                            <p className="truncate text-xs text-[#6b7280]">{user.uid}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 text-[#6b7280] lg:table-cell">
                        <div className="space-y-1">
                          <p className="truncate">{user.email}</p>
                          <p className="text-xs">{user.phone ?? "Sin teléfono"}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[user.role]}`}>
                          <RoleIcon className="h-3 w-3" />
                          {roleLabel[user.role]}
                        </span>
                      </td>
                      <td className="hidden px-5 py-3 md:table-cell">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${isDeleted ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {isDeleted ? "Suspendido" : "Activo"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#6b7280]">No encontramos usuarios con esos filtros.</div>
            ) : null}
          </div>
        </div>

        <aside className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          {selectedUser ? (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                {selectedUser.photoURL ? (
                  <Image
                    src={selectedUser.photoURL}
                    alt={selectedUser.displayName}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f3f4f6] text-lg font-semibold text-[#6b7280]">
                    {selectedUser.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold text-[#111827]">{selectedUser.displayName}</h2>
                  <p className="truncate text-sm text-[#6b7280]">{selectedUser.email}</p>
                  <p className="mt-1 text-xs text-[#9ca3af]">UID: {selectedUser.uid}</p>
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl bg-[#f8fafc] p-4 text-sm text-[#475569]">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {selectedUser.email}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {selectedUser.phone ?? "Sin teléfono"}</div>
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Registro: {formatDate(selectedUser.createdAt)}</div>
                <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Eliminación programada: {formatDate(selectedUser.scheduledDeletionAt)}</div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#111827]">Cambiar rol</h3>
                <div className="grid grid-cols-3 gap-2">
                  {(["user", "technician", "admin"] as const).map((role) => (
                    <Button
                      key={role}
                      type="button"
                      variant={selectedUser.role === role ? "default" : "outline"}
                      onClick={() => updateRole(selectedUser, role)}
                      disabled={busyKey === `role-${selectedUser.uid}` || (selectedUser.uid === currentAdminUid && role !== "admin")}
                      className={selectedUser.role === role ? "bg-[#111827] text-white hover:bg-[#111827]" : undefined}
                    >
                      {roleLabel[role]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#111827]">Acciones de cuenta</h3>
                {selectedUser.deletedAt ? (
                  <Button
                    type="button"
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => toggleDeleted(selectedUser, "restore")}
                    disabled={busyKey === `restore-${selectedUser.uid}` || selectedUser.uid === currentAdminUid}
                  >
                    Restaurar usuario
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                    onClick={() => toggleDeleted(selectedUser, "soft_delete")}
                    disabled={busyKey === `soft_delete-${selectedUser.uid}` || selectedUser.uid === currentAdminUid || selectedUser.role === "admin"}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Suspender y programar borrado
                  </Button>
                )}
                <p className="text-xs text-[#6b7280]">
                  La suspensión marca `deletedAt`, deshabilita el acceso en Firebase Auth y deja la purga final para el cron de 30 días.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-[#6b7280]">
              Selecciona un usuario para ver detalles.
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
