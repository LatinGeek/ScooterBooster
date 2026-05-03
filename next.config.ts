import { withSentryConfig } from "@sentry/nextjs"
import type { NextConfig } from "next"

// CSP: Next.js App Router still needs inline styles for Tailwind and inline/eval
// allowances for framework/runtime behavior. External origins are explicitly
// allow-listed so Firebase Auth, Google login, analytics, Sentry, and
// MercadoPago can all function without over-broad wildcards.
const csp = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://apis.google.com",
    "https://accounts.google.com",
    "https://www.gstatic.com",
    "https://ssl.gstatic.com",
  ].join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  [
    "connect-src 'self'",
    "https://*.googleapis.com",
    "https://*.firebaseio.com",
    "wss://*.firebaseio.com",
    "https://*.firebaseapp.com",
    "https://*.web.app",
    "https://*.sentry.io",
    "https://*.ingest.sentry.io",
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://www.googletagmanager.com",
    "https://apis.google.com",
    "https://accounts.google.com",
    "https://www.gstatic.com",
    "https://ssl.gstatic.com",
    "https://api.mercadopago.com",
    "https://www.mercadopago.com",
    "https://mercadopago.com.uy",
  ].join(" "),
  "media-src 'self'",
  "object-src 'none'",
  [
    "frame-src 'self'",
    "https://accounts.google.com",
    "https://apis.google.com",
    "https://*.firebaseapp.com",
    "https://*.web.app",
    "https://www.mercadopago.com",
    "https://mercadopago.com.uy",
  ].join(" "),
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
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
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp },
]

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
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
