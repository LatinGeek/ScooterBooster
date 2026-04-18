import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { adminDb } from "@/lib/firebase-admin"
import type { User } from "@/types"
import { Users, ShieldCheck, Wrench, User as UserIcon } from "lucide-react"

export const dynamic = "force-dynamic"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-UY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default async function AdminUsersPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin/users")
  if (session.role !== "admin") redirect("/")

  const snap = await adminDb
    .collection("users")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get()

  const users: User[] = snap.docs.map(
    (doc) => ({ uid: doc.id, ...doc.data() }) as unknown as User,
  )

  const roleIcon: Record<string, React.FC<{ className?: string }>> = {
    admin: ShieldCheck,
    technician: Wrench,
    user: UserIcon,
  }

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    technician: "Técnico",
    user: "Usuario",
  }

  const roleColors: Record<string, string> = {
    admin: "bg-amber-50 text-amber-700",
    technician: "bg-[#d1fae5] text-[#059669]",
    user: "bg-[#f3f4f6] text-[#6b7280]",
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Usuarios</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            {users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <Users className="h-5 w-5 text-[#1d4ed8]" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-[#f3f4f6] bg-[#fafafa]">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Usuario
              </th>
              <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280] sm:table-cell">
                Email
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Rol
              </th>
              <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280] md:table-cell">
                Registro
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f4f6]">
            {users.map((user) => {
              const RoleIcon = roleIcon[user.role] ?? UserIcon
              return (
                <tr key={user.uid} className="hover:bg-[#fafafa]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f4f6] text-sm font-semibold text-[#6b7280]">
                          {user.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <span className="font-medium text-[#111827]">{user.displayName}</span>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3 text-[#6b7280] sm:table-cell">{user.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[user.role] ?? "bg-[#f3f4f6] text-[#6b7280]"}`}
                    >
                      <RoleIcon className="h-3 w-3" />
                      {roleLabel[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="hidden px-5 py-3 text-[#6b7280] md:table-cell">
                    {user.createdAt ? formatDate(user.createdAt) : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
