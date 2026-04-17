# ScooterBooster — Roles & Permissions

## Roles Overview

| Role | Description | How Assigned |
|------|-------------|-------------|
| **user** | Scooter owner who browses, books, and reviews | Default on signup |
| **technician** | Service provider who receives bookings | Admin approval required |
| **admin** | Platform administrator | Manual assignment via Firebase console |

## User (Scooter Owner)

### Can:
- Browse scooter catalog (brands and models)
- View service listings and pricing
- Search and filter technicians by service, location, rating
- View technician profiles and reviews
- Book appointments with technicians
- Accept speed-limit disclaimer (required for speed modification services)
- Pay via MercadoPago payment links
- View their booking history and status
- Leave reviews after completed bookings
- Contact technicians via WhatsApp (wa.me links)
- Edit their profile (display name, phone)

### Cannot:
- Access technician dashboard
- Approve/reject other technicians
- Modify service catalog or scooter catalog
- Access admin panel
- View other users' booking details

## Technician

### Can:
- Everything a User can do, PLUS:
- Create and manage their technician profile (bio, location, photo)
- Set their availability schedule
- Define pricing for each service they offer
- Specify which scooter brands they support
- View their incoming bookings
- Accept/reject booking requests
- Mark bookings as in-progress or completed
- View their reviews and average rating
- View their earnings summary

### Cannot:
- Approve other technicians
- Modify the platform-wide service catalog
- Modify the scooter catalog
- Access admin panel
- Delete user reviews

### Onboarding Flow:
1. User signs up with Google SSO → role = "user"
2. User applies to become a technician (fills profile form)
3. Admin reviews application in admin panel
4. Admin approves → Firebase custom claim `role: "technician"` is set
5. Technician profile becomes visible in public listings

## Admin

### Can:
- Everything a Technician can do, PLUS:
- View and approve/reject technician applications
- Manage the scooter catalog (add/edit/deactivate brands and models)
- Manage the service catalog (add/edit/deactivate services)
- View all bookings across the platform
- View platform analytics (total bookings, revenue, active users)
- Handle booking disputes
- Deactivate user or technician accounts
- Configure platform settings (service fee percentage)

### Cannot:
- Delete the database (safeguard)
- Access Firebase console directly from the app (must use Firebase console separately)

## Firebase Custom Claims

Roles are stored as Firebase Auth custom claims for secure server-side verification:

```typescript
// Setting a role (admin API route)
await adminAuth.setCustomUserClaims(uid, { role: "technician" });

// Verifying a role (API route middleware)
const decodedToken = await adminAuth.verifyIdToken(token);
const role = decodedToken.role; // "user" | "technician" | "admin"
```

## Firestore Security Rules (Role-Based)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Technicians: public read, owner write (if approved)
    match /technicians/{techId} {
      allow read: if true;
      allow write: if request.auth.token.role == "technician"
                   && request.auth.uid == resource.data.userId;
    }

    // Bookings: user and technician can read their own
    match /bookings/{bookingId} {
      allow read: if request.auth.uid == resource.data.userId
                  || request.auth.uid == resource.data.technicianId
                  || request.auth.token.role == "admin";
      allow create: if request.auth != null;
      allow update: if request.auth.uid == resource.data.technicianId
                    || request.auth.token.role == "admin";
    }

    // Reviews: public read, creator write
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }

    // Catalog: public read, admin write
    match /scooterBrands/{brandId} {
      allow read: if true;
      allow write: if request.auth.token.role == "admin";
    }
    match /scooterModels/{modelId} {
      allow read: if true;
      allow write: if request.auth.token.role == "admin";
    }
    match /services/{serviceId} {
      allow read: if true;
      allow write: if request.auth.token.role == "admin";
    }
  }
}
```
