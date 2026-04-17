# ScooterBooster — Firebase Schema

## Firestore Database Structure

### Collection: `users`
Stores user profiles for all roles (user, technician, admin).

```typescript
interface UserDoc {
  uid: string;              // Firebase Auth UID (also document ID)
  displayName: string;
  email: string;
  photoURL: string | null;
  role: "user" | "technician" | "admin";
  phone: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:** None required (queries by UID only)

### Collection: `technicians`
Stores technician-specific profile data. Document ID is auto-generated.

```typescript
interface TechnicianDoc {
  userId: string;                    // ref to users (Firebase Auth UID)
  displayName: string;
  bio: string;
  photoURL: string;
  phone: string;
  whatsappNumber: string;           // Format: +598XXXXXXXX
  location: string;                  // City/neighborhood
  services: string[];                // Array of service IDs
  supportedBrands: string[];         // Array of brand IDs
  availability: {
    [day: string]: {                 // "monday", "tuesday", etc.
      start: string;                 // "09:00"
      end: string;                   // "18:00"
      isAvailable: boolean;
    };
  };
  pricing: {
    [serviceId: string]: {
      basePrice: number;             // In UYU
      currency: "UYU";
    };
  };
  rating: number;                    // Average rating (1.0 - 5.0)
  reviewCount: number;
  isApproved: boolean;               // Admin-approved
  isActive: boolean;                  // Self-managed visibility
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `isApproved` + `isActive` (for listing active technicians)
- `services` (array-contains for filtering by service)
- `supportedBrands` (array-contains for filtering by brand)
- `rating` (descending, for sorting)

### Collection: `scooterBrands`
Scooter manufacturer brands.

```typescript
interface ScooterBrandDoc {
  name: string;
  slug: string;
  logoURL: string | null;
  isActive: boolean;
  createdAt: Timestamp;
}
```

### Collection: `scooterModels`
Individual scooter models within a brand.

```typescript
interface ScooterModelDoc {
  brandId: string;                   // ref to scooterBrands
  name: string;
  slug: string;
  imageURL: string | null;
  specs: {
    maxSpeed: number;                // km/h (factory speed)
    range: number;                   // km
    battery: string;                 // e.g., "474 Wh"
    motor: string;                   // e.g., "300W"
    weight: number;                  // kg
  };
  compatibleServices: string[];      // Array of service IDs
  isActive: boolean;
  createdAt: Timestamp;
}
```

**Indexes:**
- `brandId` + `isActive` (for listing models by brand)

### Collection: `services`
The service catalog.

```typescript
interface ServiceDoc {
  name: string;                      // Spanish name
  slug: string;
  description: string;               // Spanish description
  category: "speed-limit" | "firmware" | "cruise-control" | "maintenance";
  estimatedDuration: number;         // minutes
  requiresDisclaimer: boolean;
  isActive: boolean;
  createdAt: Timestamp;
}
```

### Collection: `bookings`
Appointment bookings.

```typescript
interface BookingDoc {
  userId: string;                    // ref to users
  technicianId: string;              // ref to technicians
  serviceId: string;                 // ref to services
  scooterModelId: string;            // ref to scooterModels
  status: "pending" | "confirmed" | "in-progress" | "completed" | "cancelled";
  scheduledDate: Timestamp;
  notes: string | null;
  basePrice: number;                 // UYU (technician's price)
  serviceFee: number;                // UYU (platform fee)
  totalPrice: number;                // UYU (basePrice + serviceFee)
  paymentStatus: "pending" | "paid" | "refunded";
  paymentLinkId: string | null;      // MercadoPago preference ID
  paymentLinkUrl: string | null;     // MercadoPago init_point URL
  disclaimerAccepted: boolean;
  disclaimerAcceptedAt: Timestamp | null;
  disclaimerVersion: string | null;  // e.g., "1.0"
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `userId` + `createdAt` (user's booking history)
- `technicianId` + `status` (technician's active bookings)
- `status` + `createdAt` (admin view)

### Collection: `reviews`
User reviews for technicians.

```typescript
interface ReviewDoc {
  bookingId: string;                 // ref to bookings
  userId: string;                    // ref to users
  technicianId: string;              // ref to technicians
  rating: number;                    // 1-5
  comment: string;                   // 10-500 characters
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
}
```

**Indexes:**
- `technicianId` + `createdAt` (technician's reviews, sorted by date)
- `userId` + `createdAt` (user's review history)

## Firebase Auth Configuration

### Providers
- Google Sign-In (only provider enabled)

### Custom Claims
```typescript
{
  role: "user" | "technician" | "admin"
}
```

### Security Rules
See `/knowledge-base/platform/roles-and-permissions.md` for full Firestore security rules.

## Firebase Project Setup Checklist
1. Create Firebase project in Firebase Console
2. Enable Firestore Database (production mode)
3. Enable Authentication → Google Sign-In provider
4. Set up Firestore security rules
5. Create composite indexes (listed above)
6. Generate service account key for Firebase Admin SDK
7. Set environment variables in Vercel
