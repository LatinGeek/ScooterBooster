import pino from "pino"

const isDev = process.env.NODE_ENV === "development"

const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    // Redact fields that must never appear in logs
    redact: {
      paths: [
        "password",
        "token",
        "accessToken",
        "MERCADOPAGO_TEST_ACCESS_TOKEN",
        "MERCADOPAGO_LIVE_ACCESS_TOKEN",
        "MERCADOPAGO_TEST_PUBLIC_KEY",
        "MERCADOPAGO_LIVE_PUBLIC_KEY",
        "MERCADOPAGO_WEBHOOK_SECRET_TEST",
        "MERCADOPAGO_WEBHOOK_SECRET_LIVE",
        "privateKey",
        "FIREBASE_ADMIN_PRIVATE_KEY",
        "MERCADOPAGO_ACCESS_TOKEN",
        "email",
        "phone",
        "whatsappNumber",
      ],
      censor: "[REDACTED]",
    },
  },
  isDev
    ? pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      })
    : undefined
)

export default logger
