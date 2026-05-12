import { MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface WhatsAppButtonProps {
  phoneNumber: string
  message?: string
  label?: string
  className?: string
  variant?: "default" | "icon" | "floating"
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

  if (variant === "floating") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={cn(
          "fixed left-4 bottom-5 z-40 inline-flex max-w-[calc(100vw-2rem)] items-center gap-3 overflow-hidden rounded-full",
          "border border-white/20 bg-[#25d366] px-4 py-3 text-[13px] leading-none font-semibold text-white",
          "shadow-[0_18px_45px_rgba(37,211,102,0.35)] transition-all duration-200",
          "hover:-translate-y-0.5 hover:bg-[#1fb85a] focus-visible:ring-2 focus-visible:outline-none",
          "focus-visible:ring-[#25d366] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          "sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-none sm:px-5 sm:py-3.5 sm:text-sm",
          className
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <MessageCircle className="h-5 w-5" />
        </span>
        <span className="truncate whitespace-nowrap">{label}</span>
      </a>
    )
  }

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
