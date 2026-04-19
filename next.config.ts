import { withSentryConfig } from "@sentry/nextjs"
import type { NextConfig } from "next"

// CSP: Next.js App Router requires 'unsafe-inline' for styles (Tailwind) and
// 'unsafe-eval' for hydration in dev. Script 'unsafe-inline' is kept for
// compatibility until nonce infrastructure is added. All external origins are
// explicitly allow-listed; object-src 'none' blocks plugin-based XSS.
const csp = [
  "default-src 'self'",
  // Scripts: self + inline (Next hydration) + eval (dev HMR) + analytics/GTM
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
  // Styles: inline required by Tailwind
  "style-src 'self' 'unsafe-inline'",
  // Images: data URIs for inline SVG, blob for canvas exports, any HTTPS for scooter/avatar images
  "img-src 'self' data: blob: https:",
  // Fonts: only served from self (@fontsource in bundle)
  "font-src 'self'",
  // XHR/WS: Firebase, Sentry, GA, MercadoPago API, search
  [
    "connect-src 'self'",
    "https://*.googleapis.com",
    "https://*.firebaseio.com",
    "wss://*.firebaseio.com",
    "https://*.firebaseapp.com",
    "https://*.ingest.sentry.io",
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://www.googletagmanager.com",
    "https://api.mercadopago.com",
    "https://www.mercadopago.com",
    "https://mercadopago.com.uy",
  ].join(" "),
  // Media: hero video served from self
  "media-src 'self'",
  // No plugins ever
  "object-src 'none'",
  // Frames: Google Sign-In picker + MercadoPago checkout iframe
  "frame-src 'self' https://accounts.google.com https://www.mercadopago.com https://mercadopago.com.uy",
  // Workers: service worker only
  "worker-src 'self' blob:",
  // Prevent base-tag hijacking
  "base-uri 'self'",
  // Forms only submit to same origin
  "form-action 'self'",
  // Supersedes X-Frame-Options but set both for older browsers
  "frame-ancestors 'none'",
  // Force HTTPS for all sub-resources
  "upgrade-insecure-requests",
].join("; ")

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  // HSTS — only effective on HTTPS; Vercel handles this, but set for completeness
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp },
]

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  },

  // ── Image optimization ────────────────────────────────────────────────────
  images: {
    // AVIF first (best compression), WebP fallback
    formats: ["image/avif", "image/webp"],
    // Scooter images can come from Firebase Storage or external CDNs
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile pictures
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
    // Prevent layout shift — reserve space for common sizes
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "german-lamela",
  project: process.env.SENTRY_PROJECT || "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
})
