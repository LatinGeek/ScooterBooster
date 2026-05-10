import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getBookingById } from "@/lib/db/bookings"
import { getTechnicianById } from "@/lib/db/technicians"
import { getServiceById } from "@/lib/db/services"
import { getUserById } from "@/lib/db/users"
import { addAuditLogEntry } from "@/lib/db/audit-log"
import { adminDb } from "@/lib/firebase-admin"
import logger from "@/lib/logger"
import { syncMercadoPagoPayment } from "@/lib/mercadopago-payment-sync"
import { notify } from "@/lib/notifications"
import { sendBookingCancelledEmail, sendBookingConfirmedEmail } from "@/lib/notification-emails"
import { getMercadoPagoWebhookSecrets } from "@/lib/mercadopago-config"

export const dynamic = "force-dynamic"

function verifyMpSignature(req: NextRequest, body: MpWebhookBody): boolean {
  const secrets = getMercadoPagoWebhookSecrets()
  if (secrets.length === 0) {
    logger.warn("MERCADOPAGO_WEBHOOK_SECRET not set - skipping signature verification")
    return true
  }

  const xSignature = req.headers.get("x-signature") ?? ""
  const xRequestId = req.headers.get("x-request-id") ?? ""

  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [k, v] = part.split("=")
      return [k?.trim() ?? "", v?.trim() ?? ""]
    }),
  )

  const ts = parts["ts"] ?? ""
  const v1 = parts["v1"] ?? ""
  if (!ts || !v1) return false

  const dataId = body.data?.id ?? ""
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  for (const secret of secrets) {
    const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex")
    if (expected.length !== v1.length) continue
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))) {
      return true
    }
  }

  return false
}

async function isEventProcessed(eventId: string): Promise<boolean> {
  const doc = await adminDb.collection("webhookEvents").doc(eventId).get()
  return doc.exists
}

async function markEventProcessed(eventId: string, data: Record<string, unknown>): Promise<void> {
  await adminDb.collection("webhookEvents").doc(eventId).set({
    ...data,
    processedAt: new Date().toISOString(),
  })
}

interface MpWebhookBody {
  id?: string | number
  type?: string
  action?: string
  data?: { id?: string | number }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: MpWebhookBody
  try {
    body = (await req.json()) as MpWebhookBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!verifyMpSignature(req, body)) {
    logger.warn({ body }, "MP webhook signature verification failed")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const eventId = String(body.id ?? "")
  const eventType = body.type ?? ""
  const paymentId = String(body.data?.id ?? "")

  logger.info({ eventId, eventType, paymentId }, "MP webhook received")

  if (eventType !== "payment" || !paymentId) {
    return NextResponse.json({ success: true })
  }

  if (eventId && (await isEventProcessed(eventId))) {
    logger.info({ eventId }, "MP webhook already processed - skipping")
    return NextResponse.json({ success: true })
  }

  try {
    const syncResult = await syncMercadoPagoPayment({
      paymentId,
      lastWebhookEventId: eventId || null,
    })
    const mpStatus = syncResult.mpStatus

    if (syncResult.result === "no_booking") {
      if (eventId) {
        await markEventProcessed(eventId, { eventType, paymentId, mpStatus, result: "no_booking" })
      }
      return NextResponse.json({ success: true })
    }

    if (syncResult.result === "amount_mismatch") {
      if (eventId) {
        await markEventProcessed(eventId, {
          eventType,
          paymentId,
          mpStatus,
          bookingId: syncResult.bookingId,
          result: "amount_mismatch",
        })
      }

      return NextResponse.json({ success: true })
    }

    if (syncResult.result === "processed" && syncResult.bookingId) {
      logger.info(
        { bookingId: syncResult.bookingId, mpStatus },
        mpStatus === "approved"
          ? "Booking confirmed after payment approval"
          : mpStatus === "refunded" || mpStatus === "charged_back"
            ? "Booking cancelled after refund/chargeback"
            : "Payment status synchronized from MercadoPago"
      )
    }

    const booking = syncResult.bookingId ? await getBookingById(syncResult.bookingId) : null
    if (!booking) {
      return NextResponse.json({ success: true })
    }

    const [service, technician, user] = await Promise.all([
      getServiceById(booking.serviceId),
      getTechnicianById(booking.technicianId),
      getUserById(booking.userId),
    ])

    const scheduledDateLabel = new Date(booking.scheduledDate).toLocaleString("es-UY", {
      dateStyle: "full",
      timeStyle: "short",
    })

    await Promise.allSettled([
      addAuditLogEntry({
        action: "payment_webhook_processed",
        actorUid: "mercadopago-webhook",
        targetType: "booking",
        targetId: booking.id,
        metadata: {
          eventId,
          eventType,
          paymentId,
          mpStatus,
        },
      }),
      ...(mpStatus === "approved"
        ? [
            notify({
              type: "bookingStatusChanged",
              userId: booking.userId,
              bookingId: booking.id,
              newStatus: "confirmed",
            }),
          ]
        : []),
      ...(user?.email && service && technician && mpStatus === "approved"
        ? [
            sendBookingConfirmedEmail({
              to: user.email,
              bookingId: booking.id,
              serviceName: service.name,
              technicianName: technician.displayName,
              scheduledDate: scheduledDateLabel,
            }),
          ]
        : []),
      ...(user?.email &&
      service &&
      technician &&
      (mpStatus === "refunded" || mpStatus === "charged_back")
        ? [
            sendBookingCancelledEmail({
              to: user.email,
              bookingId: booking.id,
              serviceName: service.name,
              technicianName: technician.displayName,
              scheduledDate: scheduledDateLabel,
              reason: "El pago fue devuelto o desconocido por Mercado Pago.",
            }),
          ]
        : []),
    ])

    if (eventId) {
        await markEventProcessed(eventId, {
          eventType,
          paymentId,
          mpStatus,
          bookingId: booking.id,
          result: syncResult.result,
        })
      }
  } catch (err) {
    logger.error({ eventId, paymentId, err }, "Error processing MP webhook")
    return NextResponse.json({ error: "Processing error" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
