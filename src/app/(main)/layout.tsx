import { Navbar } from "@/components/navbar"
import { WhatsAppButton } from "@/components/whatsapp-button"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const supportNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER ?? "59899258620"

  return (
    <>
      <Navbar />
      <div className="flex-1">{children}</div>
      <WhatsAppButton
        phoneNumber={supportNumber}
        message="Hola, tengo una duda sobre ScooterBooster."
        label="Tenés dudas? Escribinos!"
        variant="floating"
      />
    </>
  )
}
