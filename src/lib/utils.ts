import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatWhatsAppLink(phoneNumber: string, message: string): string {
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, "")
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`
}

const SERVICE_LABELS: Record<string, string> = {
  "speed-limit": "Deslimitación",
  firmware: "Firmware",
  "cruise-control": "Control de crucero",
  maintenance: "Mantenimiento",
}

export function formatServiceLabel(serviceId: string): string {
  return SERVICE_LABELS[serviceId] ?? serviceId
}
