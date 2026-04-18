/**
 * /api/payments — base route (placeholder)
 * Real routes:
 *   POST /api/payments/initiate  — create MP preference for a booking
 *   POST /api/payments/webhook   — MercadoPago webhook handler
 */
export function GET() {
  return Response.json({ message: "See /api/payments/initiate and /api/payments/webhook" })
}
