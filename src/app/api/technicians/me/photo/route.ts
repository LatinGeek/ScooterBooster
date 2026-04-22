import { randomUUID } from "node:crypto"
import sharp from "sharp"
import { NextRequest } from "next/server"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors"
import { adminStorage } from "@/lib/firebase-admin"
import { getSession } from "@/lib/session"
import { assertTrustedOrigin } from "@/lib/security"

const MAX_IMAGE_SIZE = 2 * 1024 * 1024
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export const runtime = "nodejs"

async function uploadDerivative(
  path: string,
  buffer: Buffer,
  metadata: Record<string, string>,
) {
  const bucket = adminStorage.bucket()
  const file = bucket.file(path)

  await file.save(buffer, {
    metadata: {
      contentType: "image/webp",
      metadata,
      cacheControl: "public,max-age=31536000,immutable",
    },
    resumable: false,
    public: false,
  })

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: "2035-01-01",
  })

  return signedUrl
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "technician" && session.role !== "admin") throw new ForbiddenError()

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) throw new ForbiddenError("Necesitamos un perfil técnico antes de subir una foto.")

  const formData = await req.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    throw new ValidationError("Debes adjuntar una imagen para continuar.")
  }

  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    throw new ValidationError("La imagen debe estar en JPG, PNG o WebP.")
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new ValidationError("La imagen no puede superar los 2 MB.")
  }

  const arrayBuffer = await file.arrayBuffer()
  const source = Buffer.from(arrayBuffer)
  const metadata = { firebaseStorageDownloadTokens: randomUUID() }

  const fullBuffer = await sharp(source)
    .rotate()
    .resize(512, 512, { fit: "cover", position: "centre" })
    .webp({ quality: 86 })
    .toBuffer()

  const thumbBuffer = await sharp(source)
    .rotate()
    .resize(128, 128, { fit: "cover", position: "centre" })
    .webp({ quality: 82 })
    .toBuffer()

  const [photoURL, thumbnailURL] = await Promise.all([
    uploadDerivative(`technicians/${tech.id}/profile.webp`, fullBuffer, metadata),
    uploadDerivative(`technicians/${tech.id}/profile-thumb.webp`, thumbBuffer, metadata),
  ])

  return ok({
    photoURL,
    thumbnailURL,
  })
})
