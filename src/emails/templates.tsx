import * as React from "react"
import { Section, Text } from "@react-email/components"
import { BaseEmail } from "@/emails/base-email"

function DetailList({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <Section style={{ backgroundColor: "#f9fafb", borderRadius: "16px", padding: "18px 20px" }}>
      {items.map((item) => (
        <Text
          key={item.label}
          style={{ color: "#374151", fontSize: "14px", lineHeight: 1.7, margin: "0 0 6px" }}
        >
          <strong>{item.label}:</strong> {item.value}
        </Text>
      ))}
    </Section>
  )
}

interface BookingEmailProps {
  bookingId: string
  serviceName: string
  technicianName: string
  scheduledDate: string
  detailUrl: string
}

export function BookingCreatedEmail(
  props: BookingEmailProps & { serviceFee: string; technicianPrice: string },
) {
  return (
    <BaseEmail
      preview="Tu reserva ya fue creada y está esperando el pago."
      title="Tu reserva ya fue creada"
      intro="Ya registramos tu solicitud en ScooterBooster. Falta pagar la reserva online para confirmar el turno. El importe del servicio con el técnico se coordina y paga por fuera de la plataforma."
      ctaLabel="Ver reserva"
      ctaHref={props.detailUrl}
    >
      <DetailList
        items={[
          { label: "Reserva", value: props.bookingId },
          { label: "Servicio", value: props.serviceName },
          { label: "Técnico", value: props.technicianName },
          { label: "Fecha", value: props.scheduledDate },
          { label: "Reserva online", value: props.serviceFee },
          { label: "Pago al técnico", value: props.technicianPrice },
        ]}
      />
    </BaseEmail>
  )
}

export function BookingConfirmedEmail(props: BookingEmailProps) {
  return (
    <BaseEmail
      preview="Tu turno ya está confirmado."
      title="Reserva confirmada"
      intro="El pago de la reserva fue aprobado y tu turno quedó confirmado. Ya podés revisar el detalle y coordinar con tu técnico el pago del servicio por fuera de ScooterBooster."
      ctaLabel="Abrir detalle"
      ctaHref={props.detailUrl}
    >
      <DetailList
        items={[
          { label: "Reserva", value: props.bookingId },
          { label: "Servicio", value: props.serviceName },
          { label: "Técnico", value: props.technicianName },
          { label: "Fecha", value: props.scheduledDate },
        ]}
      />
    </BaseEmail>
  )
}

export function BookingReminderEmail(props: BookingEmailProps) {
  return (
    <BaseEmail
      preview="Recordatorio: mañana tenés una reserva en ScooterBooster."
      title="Mañana tenés un turno"
      intro="Te escribimos para recordarte tu próxima reserva. Si necesitás recoordinar, revisá el detalle para contactar al técnico."
      ctaLabel="Ver reserva"
      ctaHref={props.detailUrl}
    >
      <DetailList
        items={[
          { label: "Reserva", value: props.bookingId },
          { label: "Servicio", value: props.serviceName },
          { label: "Técnico", value: props.technicianName },
          { label: "Fecha", value: props.scheduledDate },
        ]}
      />
    </BaseEmail>
  )
}

export function BookingCompletedEmail(props: BookingEmailProps) {
  return (
    <BaseEmail
      preview="Tu servicio fue completado."
      title="Servicio completado"
      intro="Tu técnico marcó la reserva como completada. Si querés, ahora podés dejar una reseña y ayudarnos a seguir mejorando."
      ctaLabel="Ver reserva"
      ctaHref={props.detailUrl}
    >
      <DetailList
        items={[
          { label: "Reserva", value: props.bookingId },
          { label: "Servicio", value: props.serviceName },
          { label: "Técnico", value: props.technicianName },
          { label: "Fecha", value: props.scheduledDate },
        ]}
      />
    </BaseEmail>
  )
}

export function BookingCancelledEmail(props: BookingEmailProps & { reason: string }) {
  return (
    <BaseEmail
      preview="Tu reserva cambió de estado."
      title="Reserva cancelada"
      intro="La reserva fue cancelada. Abajo te dejamos el motivo registrado y el acceso al detalle por si necesitás recoordinar."
      ctaLabel="Ver detalle"
      ctaHref={props.detailUrl}
    >
      <DetailList
        items={[
          { label: "Reserva", value: props.bookingId },
          { label: "Servicio", value: props.serviceName },
          { label: "Técnico", value: props.technicianName },
          { label: "Fecha", value: props.scheduledDate },
          { label: "Motivo", value: props.reason },
        ]}
      />
    </BaseEmail>
  )
}

export function TechnicianApprovedEmail({
  technicianName,
  dashboardUrl,
}: {
  technicianName: string
  dashboardUrl: string
}) {
  return (
    <BaseEmail
      preview="Tu perfil técnico fue aprobado."
      title="Perfil técnico aprobado"
      intro={`Hola ${technicianName}, tu solicitud fue aprobada y ya podés gestionar servicios y reservas desde tu panel.`}
      ctaLabel="Ir al panel técnico"
      ctaHref={dashboardUrl}
    >
      <Text style={{ color: "#374151", fontSize: "14px", lineHeight: 1.7 }}>
        Revisá tu perfil, precios, disponibilidad y mantené tu ficha pública actualizada para
        aparecer mejor en el catálogo.
      </Text>
    </BaseEmail>
  )
}

export function TechnicianRejectedEmail({
  technicianName,
  reason,
  applyUrl,
}: {
  technicianName: string
  reason: string
  applyUrl: string
}) {
  return (
    <BaseEmail
      preview="Necesitamos algunos ajustes antes de aprobar tu perfil."
      title="Tu solicitud necesita ajustes"
      intro={`Hola ${technicianName}, revisamos tu postulación y por ahora no pudimos aprobarla. Te dejamos el motivo para que puedas corregirlo y volver a postularte.`}
      ctaLabel="Revisar postulación"
      ctaHref={applyUrl}
    >
      <DetailList items={[{ label: "Motivo", value: reason }]} />
    </BaseEmail>
  )
}
