# ScooterBooster — Service Catalog

## Services

### 1. Eliminación de Límite de Velocidad (Speed Limit Removal)

- **Slug:** `speed-limit`
- **Category:** `speed-limit`
- **Description (ES):** Eliminamos el límite de velocidad de fábrica de tu scooter eléctrico mediante modificación de firmware. Tu scooter alcanzará su velocidad máxima real.
- **Estimated Duration:** 30-60 minutes
- **Price Range:** $1,500 - $4,000 UYU (depends on model complexity)
- **Requires Disclaimer:** ✅ YES — User must accept private-use-only disclaimer
- **What's Included:**
  - Firmware analysis and backup
  - Speed limit parameter modification
  - Test ride to verify new speed
  - Post-modification firmware verification

### 2. Actualización de Firmware (Firmware Update)

- **Slug:** `firmware`
- **Category:** `firmware`
- **Description (ES):** Actualizamos el firmware de tu scooter a la última versión o instalamos firmware personalizado para optimizar rendimiento, autonomía y funcionalidades.
- **Estimated Duration:** 30-45 minutes
- **Price Range:** $1,000 - $3,000 UYU
- **Requires Disclaimer:** ❌ No
- **What's Included:**
  - Current firmware backup
  - Firmware version assessment
  - Update or custom firmware installation
  - Feature configuration
  - Post-update verification ride

### 3. Control Crucero (Cruise Control)

- **Slug:** `cruise-control`
- **Category:** `cruise-control`
- **Description (ES):** Activamos o configuramos el control crucero de tu scooter para una conducción más cómoda y eficiente. Disponible por firmware o instalación de hardware.
- **Estimated Duration:** 30-90 minutes
- **Price Range:** $1,200 - $3,500 UYU
- **Requires Disclaimer:** ❌ No
- **What's Included:**
  - Cruise control capability assessment
  - Firmware activation OR hardware installation
  - Speed threshold configuration
  - Safety testing

### 4. Mantenimiento General (General Maintenance)

- **Slug:** `maintenance`
- **Category:** `maintenance`
- **Description (ES):** Servicio completo de mantenimiento para tu scooter eléctrico. Incluye diagnóstico, ajustes, cambio de piezas y revisión de seguridad.
- **Estimated Duration:** 60-120 minutes
- **Price Range:** $800 - $5,000 UYU (depends on parts needed)
- **Requires Disclaimer:** ❌ No
- **Sub-services:**
  - **Cambio de neumáticos:** Replacement of tires (pneumatic or solid)
  - **Frenos:** Brake pad replacement and adjustment
  - **Batería:** Battery health diagnostic, cell replacement
  - **Dirección y plegado:** Stem tightening, folding mechanism repair
  - **Impermeabilización:** Waterproofing treatment
  - **Diagnóstico completo:** Full electrical and mechanical diagnostic
  - **Luces y reflectantes:** Light and reflector replacement

## Service Display Format (UI)

Each service card should show:
1. Service icon (Lucide icon)
2. Service name (Spanish)
3. Short description
4. Price range
5. Estimated duration
6. "Reservar" (Book) CTA button
7. ⚠️ Disclaimer badge if `requiresDisclaimer: true`
