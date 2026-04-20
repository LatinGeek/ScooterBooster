import type { ReactElement } from "react"
import { Resend } from "resend"
import logger from "@/lib/logger"

export interface SendEmailInput {
  to: string | string[]
  subject: string
  react: ReactElement
}

type SendEmailResult =
  | { success: true; skipped?: false; id?: string }
  | { success: true; skipped: true; reason: string }

let resendClient: Resend | null = null

function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null
  resendClient ??= new Resend(process.env.RESEND_API_KEY)
  return resendClient
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getResendClient()
  const from = process.env.NOTIFICATION_FROM_EMAIL

  if (!client || !from) {
    logger.warn(
      {
        hasApiKey: Boolean(process.env.RESEND_API_KEY),
        hasFrom: Boolean(from),
        subject: input.subject,
      },
      "Email skipped because provider is not configured",
    )
    return { success: true, skipped: true, reason: "provider_not_configured" }
  }

  const response = await client.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    react: input.react,
  })

  if (response.error) {
    throw new Error(response.error.message)
  }

  return { success: true, id: response.data?.id }
}
