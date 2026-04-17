# ScooterBooster — Speed Limit Removal Disclaimer

## Legal Disclaimer (MANDATORY)

This disclaimer MUST be shown to the user and explicitly accepted BEFORE they can book a speed limit removal service. It must be presented in a modal dialog with a checkbox that the user must check before proceeding.

### Spanish Text (Production)

> **Aviso Legal — Modificación de Límite de Velocidad**
>
> La modificación del límite de velocidad de su scooter eléctrico está destinada **únicamente para uso en propiedad privada y circuitos cerrados**.
>
> ScooterBooster y sus técnicos asociados **no se responsabilizan** por el uso de scooters modificados en vías públicas, aceras, ciclovías o cualquier espacio de uso compartido.
>
> El usuario declara y acepta que:
>
> 1. La modificación será utilizada exclusivamente en propiedad privada o circuitos cerrados autorizados.
> 2. Es su responsabilidad cumplir con todas las normativas de tránsito y regulaciones municipales vigentes en Uruguay.
> 3. Asume toda responsabilidad legal, civil y penal derivada del uso del scooter modificado.
> 4. Exime a ScooterBooster, sus empleados, y al técnico que realiza el servicio de cualquier responsabilidad por accidentes, multas, o daños que pudieran derivarse del uso del vehículo modificado.
> 5. Comprende que la modificación puede afectar la garantía del fabricante.
>
> Al marcar la casilla y continuar con la reserva, usted declara haber leído, entendido y aceptado los términos anteriores.

### English Translation (Reference Only)

> **Legal Notice — Speed Limit Modification**
>
> The modification of your electric scooter's speed limit is intended **only for use on private property and closed circuits**.
>
> ScooterBooster and its associated technicians are **not responsible** for the use of modified scooters on public roads, sidewalks, bike lanes, or any shared spaces.
>
> The user declares and accepts that:
>
> 1. The modification will be used exclusively on private property or authorized closed circuits.
> 2. It is their responsibility to comply with all traffic regulations and municipal regulations in force in Uruguay.
> 3. They assume all legal, civil, and criminal liability arising from the use of the modified scooter.
> 4. They exempt ScooterBooster, its employees, and the technician performing the service from any liability for accidents, fines, or damages that may result from the use of the modified vehicle.
> 5. They understand that the modification may void the manufacturer's warranty.
>
> By checking the box and proceeding with the booking, you declare that you have read, understood, and accepted the above terms.

## UI Implementation Requirements

### Disclaimer Modal Component
- **Trigger:** When user selects a service with `requiresDisclaimer: true`
- **Modal content:** Full Spanish disclaimer text above
- **Checkbox:** "He leído y acepto los términos del aviso legal" (I have read and accept the terms)
- **CTA button:** "Continuar con la reserva" (Continue with booking) — disabled until checkbox is checked
- **Cancel button:** "Cancelar" — closes modal, does NOT proceed with booking
- **Storage:** `disclaimerAccepted: true` and `disclaimerAcceptedAt: timestamp` stored in the booking document

### Firestore Record
When the user accepts the disclaimer, the booking document must include:
```json
{
  "disclaimerAccepted": true,
  "disclaimerAcceptedAt": "2026-04-17T14:30:00.000Z",
  "disclaimerVersion": "1.0"
}
```

The `disclaimerVersion` allows us to track which version of the disclaimer was accepted, in case we need to update it in the future.
