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
