# ScooterBooster — Technician Onboarding

## Application Flow

### Step 1: Sign Up
- Technician signs up via Google SSO (same as any user)
- Default role: `user`

### Step 2: Apply to Become a Technician
- User navigates to "Quiero ser técnico" (I want to be a technician) page
- Fills out the technician application form:

#### Required Fields
| Field | Type | Description |
|-------|------|-------------|
| Nombre completo | text | Full name |
| Teléfono | text | Phone number (with country code +598) |
| WhatsApp | text | WhatsApp number for client communication |
| Ubicación | select | City/neighborhood in Uruguay |
| Experiencia | textarea | Description of technical experience |
| Marcas que maneja | multi-select | Scooter brands they can work with |
| Servicios que ofrece | multi-select | Services they want to provide |
| Foto de perfil | file upload | Professional profile photo |

#### Optional Fields
| Field | Type | Description |
|-------|------|-------------|
| Certificaciones | textarea | Any relevant certifications |
| Sitio web/redes | text | Social media or website links |
| Horarios de atención | schedule | Weekly availability schedule |

### Step 3: Admin Review
- Application appears in admin panel under "Solicitudes de técnicos"
- Admin reviews the application details
- Admin can:
  - **Aprobar:** Sets Firebase custom claim `role: "technician"`, creates technician document in Firestore
  - **Rechazar:** Sends rejection (reason optional), user remains a regular user
  - **Solicitar más información:** Request additional details before deciding

### Step 4: Profile Setup (Post-Approval)
Once approved, the technician completes their public profile:
- Set prices for each service
- Configure availability schedule
- Write bio/description
- Upload additional photos of their workspace (optional)

### Step 5: Go Live
- Technician profile appears in public listings
- Users can now find, review, and book them

## Technician Requirements
1. Must be located in Uruguay
2. Must provide a valid WhatsApp number
3. Must demonstrate experience with at least one scooter brand
4. Must offer at least one service
5. Must maintain a minimum rating of 3.0 stars (after 5+ reviews) to remain active

## Deactivation Rules
- Admin can deactivate a technician at any time
- Automatic deactivation if rating drops below 3.0 (after 10+ reviews)
- Technician can self-deactivate (goes invisible in listings, existing bookings remain)
- Deactivated technicians can reapply after 30 days

## Locations in Uruguay (Available Options)
- Montevideo (Zona Centro, Ciudad Vieja, Pocitos, Punta Carretas, Buceo, Carrasco, Malvín, Cordón, Parque Rodó, Tres Cruces, La Blanqueada, Unión, Sayago, Cerro)
- Ciudad de la Costa
- Canelones
- Punta del Este
- Maldonado
- Colonia del Sacramento
- Paysandú
- Salto
- Rivera
- Otro (especificar)
