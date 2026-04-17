# ScooterBooster — Architecture

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16+ (App Router) | Full-stack React framework |
| Language | TypeScript (strict) | Type safety |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| UI Components | shadcn/ui | Accessible component primitives |
| Icons | Lucide React | SVG icon library |
| Database | Firebase Firestore | NoSQL document database |
| Auth | Firebase Auth | Google SSO authentication |
| Payments | MercadoPago | Payment link generation |
| Communication | WhatsApp (wa.me links) | User-technician messaging |
| Deployment | Vercel | Frontend + API routes hosting |
| Design System | UI/UX Pro Max | AI-generated design intelligence |

## Deployment Architecture

```
[User Browser]
      │
      ▼
[Vercel Edge Network]
      │
      ├── Static Assets (Next.js)
      ├── Server Components (SSR)
      └── API Routes (/api/*)
            │
            ├── Firebase Auth (verify tokens)
            ├── Firestore (read/write data)
            └── MercadoPago API (payment links)
```

## App Router Structure

```
src/app/
├── (auth)/                    # Auth group (login page)
│   └── login/page.tsx
├── (main)/                    # Public pages group
│   ├── page.tsx               # Landing/home page
│   ├── scooters/
│   │   ├── page.tsx           # Scooter brand catalog
│   │   └── [id]/page.tsx      # Scooter model details + services
│   ├── services/page.tsx      # All services listing
│   ├── technicians/
│   │   ├── page.tsx           # Technician directory
│   │   └── [id]/page.tsx      # Technician profile + reviews
│   └── booking/
│       ├── page.tsx           # Booking flow
│       └── [id]/page.tsx      # Booking confirmation/detail
├── dashboard/
│   ├── page.tsx               # User dashboard
│   └── technician/page.tsx    # Technician dashboard
├── admin/page.tsx             # Admin panel
├── api/                       # API routes
│   ├── bookings/route.ts
│   ├── payments/route.ts
│   ├── reviews/route.ts
│   └── technicians/route.ts
├── layout.tsx                 # Root layout (Spanish lang, fonts)
└── globals.css                # Global styles + Tailwind
```

## Data Flow

### Booking Flow
1. User selects scooter model → views compatible services
2. User selects service → views available technicians for that service
3. User selects technician → views profile, reviews, availability, and pricing
4. If service requires disclaimer (speed limit) → user must accept disclaimer
5. User picks date/time → submits booking request
6. System calculates total: base price + service fee (10%)
7. System generates MercadoPago payment link
8. User pays → booking status moves to "confirmed"
9. Technician receives notification (future: email/push; MVP: checks dashboard)
10. After service completion → user can leave a review

### Auth Flow
1. User clicks "Iniciar sesión" → redirected to Google SSO via Firebase Auth
2. Firebase returns user token
3. On first login → create user document in Firestore `users` collection
4. Role defaults to "user"
5. Technician role: user applies → admin approves → custom claim set
6. Admin role: set manually via Firebase console or admin API

## Environment Variables

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_PUBLIC_KEY=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=

# App
NEXT_PUBLIC_APP_URL=https://scooterbooster.uy
SERVICE_FEE_PERCENTAGE=10
```

## Performance Considerations
- Use Server Components by default (less client-side JS)
- Use `"use client"` only for interactive components
- Lazy load heavy components (booking form, admin panel)
- Optimize images with `next/image`
- Use Firestore's real-time listeners sparingly (only for booking status updates)
- Cache scooter catalog data (changes infrequently)
