import { MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface WhatsAppButtonProps {
  phoneNumber: string
  message?: string
  label?: string
  className?: string
  variant?: "default" | "icon"
}

/**
 * Generates a wa.me deep link with optional pre-filled message.
 * Opens in a new tab with noopener noreferrer for security.
 */
export function WhatsAppButton({
  phoneNumber,
  message,
  label = "Contactar por WhatsApp",
  className,
  variant = "default",
}: WhatsAppButtonProps) {
  const cleanNumber = phoneNumber.replace(/\D/g, "")
  const encodedMessage = message ? encodeURIComponent(message) : ""
  const href = `https://wa.me/${cleanNumber}${encodedMessage ? `?text=${encodedMessage}` : ""}`

  if (variant === "icon") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full",
          "cursor-pointer bg-[#25d366] text-white transition-colors duration-200 hover:bg-[#20b858]",
          className
        )}
      >
        <MessageCircle className="h-5 w-5" />
      </a>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold",
        "cursor-pointer bg-[#25d366] text-white transition-colors duration-200 hover:bg-[#20b858]",
        className
      )}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </a>
  )
}
