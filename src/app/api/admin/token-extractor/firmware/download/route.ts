import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { fail, withErrorHandling, type ApiResponse } from "@/lib/api-response"
import { assertTrustedOrigin } from "@/lib/security"
import { requireToolUser, XiaomiOperationError } from "@/lib/token-extractor/api"
import { XiaomiCloudClient } from "@/lib/token-extractor/client"
import { safeFilename } from "@/lib/token-extractor/crypto"
import { readXiaomiSession } from "@/lib/token-extractor/session"

export const dynamic = "force-dynamic"

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)
  await requireToolUser()
  const session = await readXiaomiSession()
  if (!session) return fail("Inicia sesión en Xiaomi Cloud primero", 401)
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const url = String(body.url ?? "").trim()
  if (!url) return fail("Falta la URL del firmware", 400)
  const md5 = typeof body.md5 === "string" ? body.md5 : null
  const filename = safeFilename(body.filename, "firmware.bin")
  const client = new XiaomiCloudClient({ session })
  let result
  try {
    result = await client.downloadFirmware(url, md5)
  } catch (error) {
    throw new XiaomiOperationError(error instanceof Error ? error.message : "Error descargando firmware")
  }
  return new NextResponse(new Uint8Array(result.content), {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(result.size),
      "x-firmware-md5": result.md5,
      "x-signature-marker": result.signatureMarker,
      "cache-control": "no-store",
    },
  }) as unknown as NextResponse<ApiResponse<never>>
})
