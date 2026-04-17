# ScooterBooster — Project Skill

## Context

ScooterBooster is a marketplace connecting electric scooter owners with verified technicians in Uruguay. The platform is built with Next.js 16+ (App Router), TypeScript, Tailwind CSS, Firebase (Auth + Firestore), and deployed on Vercel.

## Component Patterns

### Page Components (Server Components)
```tsx
// src/app/(main)/scooters/page.tsx
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ScooterCard } from "@/components/scooter-card";
import type { ScooterBrand } from "@/types";

export default async function ScootersPage() {
  // Server-side data fetch
  const brands = await getScooterBrands();
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Catálogo de Scooters</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands.map((brand) => (
          <ScooterCard key={brand.id} brand={brand} />
        ))}
      </div>
    </main>
  );
}
```

### Client Components
```tsx
"use client";
// Only use "use client" when you need:
// - useState, useEffect, or other hooks
// - Event handlers (onClick, onChange, etc.)
// - Browser APIs (localStorage, window, etc.)
// - Third-party client libraries
```

### API Route Pattern
```tsx
// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { z } from "zod";

const bookingSchema = z.object({
  userId: z.string(),
  technicianId: z.string(),
  serviceId: z.string(),
  scooterModelId: z.string(),
  scheduledDate: z.string().datetime(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = bookingSchema.parse(body);

    // Verify user auth via Firebase token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    // Create booking in Firestore
    const booking = await adminDb.collection("bookings").add({
      ...data,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: { id: booking.id },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
```

## Firestore Collection Schemas

### users
```json
{
  "uid": "string (Firebase Auth UID)",
  "displayName": "string",
  "email": "string",
  "photoURL": "string | null",
  "role": "user | technician | admin",
  "phone": "string | null",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### technicians
```json
{
  "userId": "string (ref to users)",
  "displayName": "string",
  "bio": "string",
  "photoURL": "string",
  "phone": "string",
  "whatsappNumber": "string",
  "location": "string (city/neighborhood in Uruguay)",
  "services": ["string (service IDs)"],
  "supportedBrands": ["string (brand IDs)"],
  "availability": {
    "monday": { "start": "09:00", "end": "18:00" },
    "tuesday": { "start": "09:00", "end": "18:00" }
  },
  "pricing": {
    "serviceId": { "basePrice": 1500, "currency": "UYU" }
  },
  "rating": "number (average, 1-5)",
  "reviewCount": "number",
  "isApproved": "boolean",
  "isActive": "boolean",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### scooterBrands
```json
{
  "name": "string",
  "slug": "string",
  "logoURL": "string | null",
  "isActive": "boolean"
}
```

### scooterModels
```json
{
  "brandId": "string (ref to scooterBrands)",
  "name": "string",
  "slug": "string",
  "imageURL": "string | null",
  "specs": {
    "maxSpeed": "number (km/h)",
    "range": "number (km)",
    "battery": "string",
    "motor": "string (watts)",
    "weight": "number (kg)"
  },
  "compatibleServices": ["string (service IDs)"],
  "isActive": "boolean"
}
```

### services
```json
{
  "name": "string",
  "slug": "string",
  "description": "string (Spanish)",
  "category": "speed-limit | firmware | cruise-control | maintenance",
  "estimatedDuration": "number (minutes)",
  "requiresDisclaimer": "boolean",
  "isActive": "boolean"
}
```

### bookings
```json
{
  "userId": "string (ref to users)",
  "technicianId": "string (ref to technicians)",
  "serviceId": "string (ref to services)",
  "scooterModelId": "string (ref to scooterModels)",
  "status": "pending | confirmed | in-progress | completed | cancelled",
  "scheduledDate": "timestamp",
  "notes": "string | null",
  "basePrice": "number (UYU)",
  "serviceFee": "number (UYU)",
  "totalPrice": "number (UYU)",
  "paymentStatus": "pending | paid | refunded",
  "paymentLinkId": "string | null (MercadoPago)",
  "disclaimerAccepted": "boolean",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### reviews
```json
{
  "bookingId": "string (ref to bookings)",
  "userId": "string (ref to users)",
  "technicianId": "string (ref to technicians)",
  "rating": "number (1-5)",
  "comment": "string",
  "createdAt": "timestamp"
}
```

## UI Conventions

- All text content in **Spanish**
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- Icons from `lucide-react` only — never emojis
- `cursor-pointer` on all clickable elements
- Transitions: `transition-all duration-200 ease-in-out`
- Border radius: `rounded-lg` (default), `rounded-xl` (cards), `rounded-full` (avatars)
- Shadows: `shadow-sm` (subtle), `shadow-md` (cards), `shadow-lg` (modals)
- Spacing: Use Tailwind spacing scale consistently (4, 6, 8 for gaps)

## Spanish UI Text Reference

| English | Spanish |
|---------|---------|
| Search | Buscar |
| Book now | Reservar ahora |
| View details | Ver detalles |
| My bookings | Mis reservas |
| Technicians | Técnicos |
| Services | Servicios |
| Scooters | Scooters |
| Rating | Calificación |
| Reviews | Reseñas |
| Price | Precio |
| Schedule | Agendar |
| Cancel | Cancelar |
| Confirm | Confirmar |
| Login | Iniciar sesión |
| Logout | Cerrar sesión |
| Dashboard | Panel |
| Admin | Administración |
| Settings | Configuración |
| Loading... | Cargando... |
| Error | Error |
| Success | Éxito |
| Available | Disponible |
| Unavailable | No disponible |
| Pending | Pendiente |
| Confirmed | Confirmado |
| Completed | Completado |
| Cancelled | Cancelado |
