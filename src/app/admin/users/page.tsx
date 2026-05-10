import { redirect } from "next/navigation"
import { AdminErrorBoundary } from "@/components/admin-error-boundary"
import { getLatestUsers } from "@/lib/db/users"
import { getSession } from "@/lib/session"
import { AdminUsersClient } from "./users-client"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin/users")
  if (session.role !== "admin") redirect("/")

  const searchParams = await props.searchParams
  const pageValue = searchParams.page
  const cursorValue = searchParams.cursor
  const stackValue = searchParams.stack

  const page = Math.max(1, Number.parseInt(typeof pageValue === "string" ? pageValue : "1", 10) || 1)
  const pageSize = 50
  const currentCursor = typeof cursorValue === "string" ? cursorValue : undefined
  const cursorStack = typeof stackValue === "string"
    ? stackValue.split(",").map((value) => value.trim()).filter(Boolean)
    : []

  const result = await getLatestUsers(pageSize, { startAfter: currentCursor })

  return (
    <AdminErrorBoundary>
      <AdminUsersClient
        key={`${page}:${currentCursor ?? "root"}`}
        users={result.users}
        currentAdminUid={session.uid}
        page={page}
        pageSize={pageSize}
        hasMore={result.hasMore}
        nextCursor={result.lastId}
        currentCursor={currentCursor}
        cursorStack={cursorStack}
      />
    </AdminErrorBoundary>
  )
}
