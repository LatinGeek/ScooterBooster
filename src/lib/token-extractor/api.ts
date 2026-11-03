import type { NextRequest } from "next/server"
import { AppError, AuthError, ForbiddenError } from "@/lib/errors"
import { getSession } from "@/lib/session"

export type ToolRole = "admin" | "technician"

export async function requireToolUser(): Promise<{ uid: string; role: ToolRole }> {
  const session = await getSession()
  if (!session) throw new AuthError()
  const role = session.role as string | undefined
  if (role !== "admin" && role !== "technician") throw new ForbiddenError()
  return { uid: session.uid, role }
}

export function currentRole(req: NextRequest): ToolRole | null {
  const role = req.cookies.get("__role")?.value
  return role === "admin" || role === "technician" ? role : null
}

export class XiaomiOperationError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(message, message, statusCode)
    this.name = "XiaomiOperationError"
  }
}
