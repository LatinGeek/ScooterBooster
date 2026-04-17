# ScooterBooster — WhatsApp Integration

## Overview

ScooterBooster uses simple `wa.me` links for user-technician communication. No WhatsApp Business API is needed for the MVP.

## How It Works

### wa.me Link Format

```
https://wa.me/{phoneNumber}?text={encodedMessage}
```

- **phoneNumber:** International format without + or spaces (e.g., `59899123456`)
- **text:** URL-encoded pre-filled message

### Example Links

#### General Contact

```
https://wa.me/59899123456?text=Hola%2C%20te%20contacto%20desde%20ScooterBooster
```

#### Pre-Booking Inquiry

```
https://wa.me/59899123456?text=Hola%2C%20me%20interesa%20el%20servicio%20de%20eliminaci%C3%B3n%20de%20l%C3%ADmite%20de%20velocidad%20para%20mi%20Xiaomi%20Pro%202.%20%C2%BFTen%C3%A9s%20disponibilidad%3F
```

(Translation: "Hi, I'm interested in the speed limit removal service for my Xiaomi Pro 2. Do you have availability?")

#### Post-Booking Communication

```
https://wa.me/59899123456?text=Hola%2C%20tengo%20una%20reserva%20%23{bookingId}%20en%20ScooterBooster.%20%C2%BFPodemos%20coordinar%20los%20detalles%3F
```

(Translation: "Hi, I have a booking #{bookingId} on ScooterBooster. Can we coordinate the details?")

## UI Component

### WhatsApp Button

A reusable component that generates a wa.me link with a pre-filled message:

```tsx
// Usage
<WhatsAppButton
  phoneNumber="59899123456"
  message="Hola, te contacto desde ScooterBooster"
  label="Contactar por WhatsApp"
/>
```

### Button Styling

- Green background (#25D366 — WhatsApp brand color)
- White text
- WhatsApp icon (use Lucide `MessageCircle` or custom WhatsApp SVG)
- Rounded corners, cursor-pointer
- Opens in new tab (`target="_blank"`)
- Includes `rel="noopener noreferrer"` for security

### Where WhatsApp Button Appears

1. **Technician profile page** — "Contactar por WhatsApp"
2. **Booking confirmation page** — "Contactar al técnico por WhatsApp"
3. **Booking detail page** — For ongoing communication

## Phone Number Format

- Technicians store their WhatsApp number in format: `+598XXXXXXXX`
- For wa.me links, strip the `+` sign: `598XXXXXXXX`
- Uruguay country code: `598`
- Mobile numbers: `598 9X XXX XXXX` (9 digits after country code)

## Future Enhancement

- WhatsApp Business API integration for automated booking notifications
- Chatbot for basic inquiries
- Broadcast messages for promotions
