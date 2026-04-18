import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import crypto from "crypto"
import { getBookingByExternalReference, updateBookingPaymentStatus } from "@/lib/db/bookings"
import logger from "@/lib/logger"
import { adminDb } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"

// ─── Signature verification ───────────────────────────────────────────────────

/**
 * Verify the MercadoPago webhook signature.
 * MP sends: x-signature: ts=<timestamp>,v1=<hmac>
 * The signed payload is: "id:{data.id};request-id:{x-request-id};ts:{timestamp};"
 * Ref: https://www.mercadopago.com.uy/developers/en/docs/your-integrations/notifications/webhooks
 */
function verifyMpSignature(req: NextRequest, body: MpWebhookBody): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) {
    // If no secret configured (dev mode), skip verification but log a warning
    logger.warn("MERCADOPAGO_WEBHOOK_SECRET not set — skipping signature verification")
    return true
  }

  const xSignature = req.headers.get("x-signature") ?? ""
  const xRequestId = req.headers.get("x-request-id") ?? ""

  // Parse ts and v1 from "ts=<ts>,v1=<hash>"
  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [k, v] = part.split("=")
      return [k?.trim() ?? "", v?.trim() ?? ""]
    })
  )

  const ts = parts["ts"] ?? ""
  const v1 = parts["v1"] ?? ""
  if (!ts || !v1) return false

  const dataId = body.data?.id ?? ""
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`

  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex")

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
}

// ─── Idempotency ──────────────────────────────────────────────────────────────

async function isEventProcessed(eventId: string): Promise<boolean> {
  const doc = await adminDb.collection("webhookEvents").doc(eventId).get()
  return doc.exists
}

async function markEventProcessed(eventId: string, data: Record<string, unknown>): Promise<void> {
  await adminDb
    .collection("webhookEvents")
    .doc(eventId)
    .set({
      ...data,
      processedAt: new Date().toISOString(),
    })
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MpWebhookBody {
  id?: string | number
  type?: string
  action?: string
  data?: { id?: string | number }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: MpWebhookBody
  try {
    body = (await req.json()) as MpWebhookBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Verify signature
  if (!verifyMpSignature(req, body)) {
    logger.warn({ body }, "MP webhook signature verification failed")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const eventId = String(body.id ?? "")
  const eventType = body.type ?? ""
  const paymentId = String(body.data?.id ?? "")

  logger.info({ eventId, eventType, paymentId }, "MP webhook received")

  // Only process payment events
  if (eventType !== "payment" || !paymentId) {
    return NextResponse.json({ success: true })
  }

  // Idempotency check
  if (eventId && (await isEventProcessed(eventId))) {
    logger.info({ eventId }, "MP webhook already processed — skipping")
    return NextResponse.json({ success: true })
  }

  try {
    const mpClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    })
    const paymentClient = new Payment(mpClient)
    const payment = await paymentClient.get({ id: paymentId })

    const mpStatus = payment.status // "approved" | "rejected" | "cancelled" | "refunded" | "pending" | etc.
    const externalRef = payment.external_reference ?? ""

    logger.info({ paymentId, mpStatus, externalRef }, "MP payment fetched")

    const booking = await getBookingByExternalReference(externalRef)
    if (!booking) {
      logger.warn({ externalRef }, "No booking found for MP external_reference")
      // Still mark as processed so we don't retry forever
      if (eventId)
        await markEventProcessed(eventId, { eventType, paymentId, mpStatus, result: "no_booking" })
      return NextResponse.json({ success: true })
    }

    // Reconcile booking status based on MP payment status
    if (mpStatus === "approved") {
      await updateBookingPaymentStatus(booking.id, "paid", "confirmed")
      logger.info({ bookingId: booking.id }, "Booking confirmed after payment approval")
    } else if (mpStatus === "refunded" || mpStatus === "charged_back") {
      await updateBookingPaymentStatus(booking.id, "refunded", "cancelled_by_user")
      logger.info({ bookingId: booking.id }, "Booking cancelled after refund/chargeback")
    } else if (mpStatus === "rejected" || mpStatus === "cancelled") {
      // Leave booking as pending — user can retry payment
      await updateBookingPaymentStatus(booking.id, "pending")
      logger.info({ bookingId: booking.id, mpStatus }, "Payment rejected — booking stays pending")
    }
    // "pending" or "in_process" — no action needed, wait for next webhook

    // Mark event as processed
    if (eventId) {
      await markEventProcessed(eventId, {
        eventType,
        paymentId,
        mpStatus,
        bookingId: booking.id,
        result: "processed",
      })
    }
  } catch (err) {
    logger.error({ eventId, paymentId, err }, "Error processing MP webhook")
    // Return 500 so MP retries the webhook
    return NextResponse.json({ error: "Processing error" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
