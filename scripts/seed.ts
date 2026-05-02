/**
 * Seed script: populates Firestore with initial data for ScooterBooster
 * Usage: npx tsx scripts/seed.ts
 *
 * Reads credentials from .env.local — requires FIREBASE_ADMIN_* vars to be set.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()
const now = Timestamp.now()

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

function buildSearchTokens(...values: Array<string | undefined | null>): string[] {
  const tokens = new Set<string>()

  for (const value of values) {
    if (!value) continue
    for (const token of normalizeSearchText(value).split(" ")) {
      if (token) tokens.add(token)
    }
  }

  return [...tokens]
}

// ─── SERVICE IDs (deterministic so we can reference them in models) ───────────
const SERVICE_IDS = {
  speedLimit: "speed-limit",
  firmware: "firmware",
  cruiseControl: "cruise-control",
  maintenance: "maintenance",
}

// ─── BRAND IDs ─────────────────────────────────────────────────────────────────
const BRAND_IDS = {
  xiaomi: "brand-xiaomi",
  atom: "brand-atom",
  joyor: "brand-joyor",
  mistyle: "brand-mistyle",
  navee: "brand-navee",
  segway: "brand-segway",
  dualtron: "brand-dualtron",
  kaabo: "brand-kaabo",
  vsett: "brand-vsett",
  zero: "brand-zero",
  inokim: "brand-inokim",
}

const BRAND_NAMES_BY_ID: Record<string, string> = {
  [BRAND_IDS.xiaomi]: "Xiaomi",
  [BRAND_IDS.atom]: "Atom",
  [BRAND_IDS.joyor]: "Joyor",
  [BRAND_IDS.mistyle]: "MiStyle",
  [BRAND_IDS.navee]: "Navee",
  [BRAND_IDS.segway]: "Segway-Ninebot",
  [BRAND_IDS.dualtron]: "Dualtron",
  [BRAND_IDS.kaabo]: "Kaabo",
  [BRAND_IDS.vsett]: "VSETT",
  [BRAND_IDS.zero]: "Zero",
  [BRAND_IDS.inokim]: "Inokim",
}

const SERVICE_NAMES_BY_ID: Record<string, string> = {
  [SERVICE_IDS.speedLimit]: "Eliminación de Límite de Velocidad",
  [SERVICE_IDS.firmware]: "Actualización de Firmware",
  [SERVICE_IDS.cruiseControl]: "Control Crucero",
  [SERVICE_IDS.maintenance]: "Mantenimiento General",
}

async function seedServices() {
  console.log("🔧 Seeding services…")
  const services = [
    {
      id: SERVICE_IDS.speedLimit,
      name: "Eliminación de Límite de Velocidad",
      slug: "speed-limit",
      description:
        "Eliminamos el límite de velocidad de fábrica de tu scooter eléctrico mediante modificación de firmware. Tu scooter alcanzará su velocidad máxima real.",
      category: "speed-limit",
      estimatedDuration: 45,
      requiresDisclaimer: true,
      isActive: true,
      createdAt: now,
    },
    {
      id: SERVICE_IDS.firmware,
      name: "Actualización de Firmware",
      slug: "firmware",
      description:
        "Actualizamos el firmware de tu scooter a la última versión o instalamos firmware personalizado para optimizar rendimiento, autonomía y funcionalidades.",
      category: "firmware",
      estimatedDuration: 40,
      requiresDisclaimer: false,
      isActive: true,
      createdAt: now,
    },
    {
      id: SERVICE_IDS.cruiseControl,
      name: "Control Crucero",
      slug: "cruise-control",
      description:
        "Activamos o configuramos el control crucero de tu scooter para una conducción más cómoda y eficiente. Disponible por firmware o instalación de hardware.",
      category: "cruise-control",
      estimatedDuration: 60,
      requiresDisclaimer: false,
      isActive: true,
      createdAt: now,
    },
    {
      id: SERVICE_IDS.maintenance,
      name: "Mantenimiento General",
      slug: "maintenance",
      description:
        "Servicio completo de mantenimiento para tu scooter eléctrico. Incluye diagnóstico, ajustes, cambio de piezas y revisión de seguridad.",
      category: "maintenance",
      estimatedDuration: 90,
      requiresDisclaimer: false,
      isActive: true,
      createdAt: now,
    },
  ]

  for (const svc of services) {
    const { id, ...data } = svc
    await db
      .collection("services")
      .doc(id)
      .set({
        ...data,
        searchTokens: buildSearchTokens(data.name, data.slug, data.description, data.category),
      })
    console.log(`  ✅ ${svc.name}`)
  }
}

async function seedBrands() {
  console.log("🏷️  Seeding brands…")
  const brands = [
    {
      id: BRAND_IDS.xiaomi,
      name: "Xiaomi",
      slug: "xiaomi",
      logoURL: null,
      isActive: true,
      createdAt: now,
    },
    {
      id: BRAND_IDS.atom,
      name: "Atom",
      slug: "atom",
      logoURL: null,
      isActive: true,
      createdAt: now,
    },
    {
      id: BRAND_IDS.joyor,
      name: "Joyor",
      slug: "joyor",
      logoURL: null,
      isActive: true,
      createdAt: now,
    },
    {
      id: BRAND_IDS.mistyle,
      name: "MiStyle",
      slug: "mistyle",
      logoURL: null,
      isActive: true,
      createdAt: now,
    },
    {
      id: BRAND_IDS.navee,
      name: "Navee",
      slug: "navee",
      logoURL: null,
      isActive: true,
      createdAt: now,
    },
    {
      id: BRAND_IDS.segway,
      name: "Segway-Ninebot",
      slug: "segway-ninebot",
      logoURL: null,
      isActive: true,
      createdAt: now,
    },
    {
      id: BRAND_IDS.dualtron,
      name: "Dualtron",
      slug: "dualtron",
      logoURL: null,
      isActive: true,
      createdAt: now,
    },
    {
      id: BRAND_IDS.kaabo,
      name: "Kaabo",
      slug: "kaabo",
      logoURL: null,
      isActive: true,
      createdAt: now,
    },
    {
      id: BRAND_IDS.vsett,
      name: "VSETT",
      slug: "vsett",
      logoURL: null,
      isActive: true,
      createdAt: now,
    },
    {
      id: BRAND_IDS.zero,
      name: "Zero",
      slug: "zero",
      logoURL: null,
      isActive: true,
      createdAt: now,
    },
    {
      id: BRAND_IDS.inokim,
      name: "Inokim",
      slug: "inokim",
      logoURL: null,
      isActive: true,
      createdAt: now,
    },
  ]

  for (const brand of brands) {
    const { id, ...data } = brand
    await db
      .collection("scooterBrands")
      .doc(id)
      .set({
        ...data,
        searchTokens: buildSearchTokens(data.name, data.slug),
      })
    console.log(`  ✅ ${brand.name}`)
  }
}

// All services except firmware for Inokim (limited support)
const ALL_SERVICES = Object.values(SERVICE_IDS)
const INOKIM_SERVICES = [SERVICE_IDS.speedLimit, SERVICE_IDS.cruiseControl, SERVICE_IDS.maintenance]

async function seedModels() {
  console.log("🛴  Seeding scooter models…")

  const imageBasePath = "/assets/scooter-model-images"

  const models: Array<{
    id: string
    brandId: string
    name: string
    slug: string
    imageURL: string | null
    specs: { maxSpeed: number; range: number; battery: string; motor: string; weight: number }
    compatibleServices: string[]
    isActive: boolean
    createdAt: FirebaseFirestore.Timestamp
  }> = [
    // Xiaomi
    {
      id: "xiaomi-1s",
      brandId: BRAND_IDS.xiaomi,
      name: "Mi Electric Scooter 1S",
      slug: "xiaomi-mi-1s",
      imageURL: null,
      specs: { maxSpeed: 25, range: 30, battery: "275 Wh", motor: "300W", weight: 12.5 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-pro2",
      brandId: BRAND_IDS.xiaomi,
      name: "Mi Electric Scooter Pro 2",
      slug: "xiaomi-mi-pro-2",
      imageURL: null,
      specs: { maxSpeed: 25, range: 45, battery: "474 Wh", motor: "300W", weight: 14.2 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-3",
      brandId: BRAND_IDS.xiaomi,
      name: "Mi Electric Scooter 3",
      slug: "xiaomi-mi-3",
      imageURL: null,
      specs: { maxSpeed: 25, range: 30, battery: "275 Wh", motor: "300W", weight: 13.2 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-4pro",
      brandId: BRAND_IDS.xiaomi,
      name: "Mi Electric Scooter 4 Pro",
      slug: "xiaomi-mi-4-pro",
      imageURL: null,
      specs: { maxSpeed: 25, range: 55, battery: "474 Wh", motor: "350W", weight: 16.5 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-4ultra",
      brandId: BRAND_IDS.xiaomi,
      name: "Mi Electric Scooter 4 Ultra",
      slug: "xiaomi-mi-4-ultra",
      imageURL: `${imageBasePath}/xiaomi-scooter-4-ultra.png`,
      specs: { maxSpeed: 25, range: 70, battery: "561 Wh", motor: "500W", weight: 24 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-m365",
      brandId: BRAND_IDS.xiaomi,
      name: "Xiaomi Scooter M365",
      slug: "xiaomi-scooter-m365",
      imageURL: `${imageBasePath}/xiaomi-scooter-m365.png`,
      specs: { maxSpeed: 25, range: 30, battery: "280 Wh", motor: "250W", weight: 12.5 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-elite",
      brandId: BRAND_IDS.xiaomi,
      name: "Xiaomi Scooter Elite",
      slug: "xiaomi-scooter-elite",
      imageURL: `${imageBasePath}/xiaomi-scooter-elite.png`,
      specs: { maxSpeed: 25, range: 45, battery: "360 Wh", motor: "400W", weight: 20 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-4-lite-2nd-gen",
      brandId: BRAND_IDS.xiaomi,
      name: "Xiaomi Scooter 4 Lite (2nd Gen)",
      slug: "xiaomi-scooter-4-lite-2nd-gen",
      imageURL: `${imageBasePath}/xiaomi-scooter-4-lite-2nd-gen.png`,
      specs: { maxSpeed: 25, range: 25, battery: "225 Wh", motor: "300W", weight: 16.2 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-4-pro-2nd-gen",
      brandId: BRAND_IDS.xiaomi,
      name: "Xiaomi Scooter 4 Pro (2nd Gen)",
      slug: "xiaomi-scooter-4-pro-2nd-gen",
      imageURL: `${imageBasePath}/xiaomi-scooter-4-pro-2nd-gen.png`,
      specs: { maxSpeed: 25, range: 60, battery: "468 Wh", motor: "400W", weight: 19 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-5-standard",
      brandId: BRAND_IDS.xiaomi,
      name: "Xiaomi Scooter 5",
      slug: "xiaomi-scooter-5-standard",
      imageURL: `${imageBasePath}/xiaomi-scooter-5-standard.png`,
      specs: { maxSpeed: 25, range: 60, battery: "477 Wh", motor: "350W", weight: 20.1 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-5-plus",
      brandId: BRAND_IDS.xiaomi,
      name: "Xiaomi Scooter 5 Plus",
      slug: "xiaomi-scooter-5-plus",
      imageURL: `${imageBasePath}/xiaomi-scooter-5-plus.png`,
      specs: { maxSpeed: 25, range: 60, battery: "477 Wh", motor: "400W", weight: 22.5 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-5-max",
      brandId: BRAND_IDS.xiaomi,
      name: "Xiaomi Scooter 5 Max",
      slug: "xiaomi-scooter-5-max",
      imageURL: `${imageBasePath}/xiaomi-scooter-5-max.png`,
      specs: { maxSpeed: 25, range: 60, battery: "477 Wh", motor: "400W", weight: 22.3 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-5-pro",
      brandId: BRAND_IDS.xiaomi,
      name: "Xiaomi Scooter 5 Pro",
      slug: "xiaomi-scooter-5-pro",
      imageURL: `${imageBasePath}/xiaomi-scooter-5-pro.png`,
      specs: { maxSpeed: 25, range: 60, battery: "477 Wh", motor: "400W", weight: 22.4 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-6-lite",
      brandId: BRAND_IDS.xiaomi,
      name: "Xiaomi Scooter 6 Lite",
      slug: "xiaomi-scooter-6-lite",
      imageURL: `${imageBasePath}/xiaomi-scooter-6-lite.png`,
      specs: { maxSpeed: 25, range: 40, battery: "360 Wh", motor: "350W", weight: 19.2 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-6-standard",
      brandId: BRAND_IDS.xiaomi,
      name: "Xiaomi Scooter 6",
      slug: "xiaomi-scooter-6-standard",
      imageURL: `${imageBasePath}/xiaomi-scooter-6-standard.png`,
      specs: { maxSpeed: 25, range: 60, battery: "477 Wh", motor: "400W", weight: 22.5 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "xiaomi-6-pro",
      brandId: BRAND_IDS.xiaomi,
      name: "Xiaomi Scooter 6 Pro",
      slug: "xiaomi-scooter-6-pro",
      imageURL: `${imageBasePath}/xiaomi-scooter-6-pro.png`,
      specs: { maxSpeed: 25, range: 60, battery: "477 Wh", motor: "500W", weight: 26.2 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    // Atom
    {
      id: "atom-energy",
      brandId: BRAND_IDS.atom,
      name: "Atom Energy",
      slug: "atom-energy",
      imageURL: `${imageBasePath}/atom-energy.png`,
      specs: { maxSpeed: 25, range: 30, battery: "374 Wh", motor: "350W", weight: 17.5 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "atom-kaizen-pro",
      brandId: BRAND_IDS.atom,
      name: "Atom Kaizen Pro",
      slug: "atom-kaizen-pro",
      imageURL: `${imageBasePath}/atom-kaizen-pro.png`,
      specs: { maxSpeed: 32, range: 45, battery: "468 Wh", motor: "500W", weight: 21.5 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "atom-tenacity",
      brandId: BRAND_IDS.atom,
      name: "Atom Tenacity",
      slug: "atom-tenacity",
      imageURL: `${imageBasePath}/atom-tenacity.png`,
      specs: { maxSpeed: 35, range: 55, battery: "540 Wh", motor: "600W", weight: 23.8 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "atom-vitality",
      brandId: BRAND_IDS.atom,
      name: "Atom Vitality",
      slug: "atom-vitality",
      imageURL: `${imageBasePath}/atom-vitality.png`,
      specs: { maxSpeed: 25, range: 35, battery: "360 Wh", motor: "350W", weight: 18.4 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    // Joyor
    {
      id: "joyor-s5",
      brandId: BRAND_IDS.joyor,
      name: "Joyor S5",
      slug: "joyor-s5",
      imageURL: `${imageBasePath}/joyor-s5.png`,
      specs: { maxSpeed: 25, range: 55, battery: "624 Wh", motor: "600W", weight: 22.1 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "joyor-s8",
      brandId: BRAND_IDS.joyor,
      name: "Joyor S8",
      slug: "joyor-s8",
      imageURL: `${imageBasePath}/joyor-s8.png`,
      specs: { maxSpeed: 25, range: 80, battery: "1248 Wh", motor: "2000W", weight: 27.5 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "joyor-s10-s",
      brandId: BRAND_IDS.joyor,
      name: "Joyor S10-S",
      slug: "joyor-s10-s",
      imageURL: `${imageBasePath}/joyor-s10-s.png`,
      specs: { maxSpeed: 25, range: 85, battery: "1296 Wh", motor: "2000W", weight: 28.4 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "joyor-x1",
      brandId: BRAND_IDS.joyor,
      name: "Joyor X1",
      slug: "joyor-x1",
      imageURL: `${imageBasePath}/joyor-x1.png`,
      specs: { maxSpeed: 25, range: 30, battery: "346 Wh", motor: "350W", weight: 13.5 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "joyor-y5",
      brandId: BRAND_IDS.joyor,
      name: "Joyor Y5",
      slug: "joyor-y5",
      imageURL: `${imageBasePath}/joyor-y5.png`,
      specs: { maxSpeed: 25, range: 50, battery: "624 Wh", motor: "500W", weight: 22 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "joyor-y8",
      brandId: BRAND_IDS.joyor,
      name: "Joyor Y8",
      slug: "joyor-y8",
      imageURL: `${imageBasePath}/joyor-y8.png`,
      specs: { maxSpeed: 25, range: 100, battery: "1248 Wh", motor: "500W", weight: 24.5 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    // MiStyle
    {
      id: "mistyle-me500",
      brandId: BRAND_IDS.mistyle,
      name: "MiStyle ME500",
      slug: "mistyle-me500",
      imageURL: `${imageBasePath}/mistyle-me500.png`,
      specs: { maxSpeed: 25, range: 45, battery: "499 Wh", motor: "500W", weight: 19.5 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "mistyle-me800",
      brandId: BRAND_IDS.mistyle,
      name: "MiStyle ME800",
      slug: "mistyle-me800",
      imageURL: `${imageBasePath}/mistyle-me800.png`,
      specs: { maxSpeed: 25, range: 55, battery: "624 Wh", motor: "600W", weight: 21.2 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "mistyle-me1000",
      brandId: BRAND_IDS.mistyle,
      name: "MiStyle ME1000",
      slug: "mistyle-me1000",
      imageURL: `${imageBasePath}/mistyle-me1000.png`,
      specs: { maxSpeed: 32, range: 65, battery: "960 Wh", motor: "1000W", weight: 25.8 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "mistyle-t1",
      brandId: BRAND_IDS.mistyle,
      name: "MiStyle T1",
      slug: "mistyle-t1",
      imageURL: `${imageBasePath}/mistyle-t1.png`,
      specs: { maxSpeed: 25, range: 35, battery: "360 Wh", motor: "350W", weight: 17.8 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "mistyle-t1-max",
      brandId: BRAND_IDS.mistyle,
      name: "MiStyle T1 Max",
      slug: "mistyle-t1-max",
      imageURL: `${imageBasePath}/mistyle-t1-max.png`,
      specs: { maxSpeed: 25, range: 45, battery: "499 Wh", motor: "500W", weight: 19.1 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    // Navee
    {
      id: "navee-st3-pro",
      brandId: BRAND_IDS.navee,
      name: "Navee ST3 Pro",
      slug: "navee-st3-pro",
      imageURL: `${imageBasePath}/navee-st3-pro.png`,
      specs: { maxSpeed: 25, range: 65, battery: "596 Wh", motor: "600W", weight: 25.3 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "navee-gt3-pro",
      brandId: BRAND_IDS.navee,
      name: "Navee GT3 Pro",
      slug: "navee-gt3-pro",
      imageURL: `${imageBasePath}/navee-gt3-pro.png`,
      specs: { maxSpeed: 25, range: 75, battery: "720 Wh", motor: "700W", weight: 27.5 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    // Segway-Ninebot
    {
      id: "segway-e2",
      brandId: BRAND_IDS.segway,
      name: "Ninebot KickScooter E2",
      slug: "segway-ninebot-e2",
      imageURL: null,
      specs: { maxSpeed: 20, range: 20, battery: "184 Wh", motor: "250W", weight: 13 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "segway-f2",
      brandId: BRAND_IDS.segway,
      name: "Ninebot KickScooter F2",
      slug: "segway-ninebot-f2",
      imageURL: null,
      specs: { maxSpeed: 25, range: 40, battery: "367 Wh", motor: "350W", weight: 15.8 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "segway-maxg30",
      brandId: BRAND_IDS.segway,
      name: "Ninebot KickScooter Max G30",
      slug: "segway-ninebot-max-g30",
      imageURL: null,
      specs: { maxSpeed: 30, range: 65, battery: "551 Wh", motor: "350W", weight: 18.7 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "segway-maxg2",
      brandId: BRAND_IDS.segway,
      name: "Ninebot KickScooter Max G2",
      slug: "segway-ninebot-max-g2",
      imageURL: null,
      specs: { maxSpeed: 25, range: 70, battery: "551 Wh", motor: "450W", weight: 20 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "segway-gt2",
      brandId: BRAND_IDS.segway,
      name: "Ninebot KickScooter GT2",
      slug: "segway-ninebot-gt2",
      imageURL: null,
      specs: { maxSpeed: 70, range: 90, battery: "1512 Wh", motor: "3000W", weight: 52.6 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    // Dualtron
    {
      id: "dualtron-mini",
      brandId: BRAND_IDS.dualtron,
      name: "Dualtron Mini",
      slug: "dualtron-mini",
      imageURL: null,
      specs: { maxSpeed: 45, range: 55, battery: "748 Wh", motor: "1000W", weight: 20 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "dualtron-compact",
      brandId: BRAND_IDS.dualtron,
      name: "Dualtron Compact",
      slug: "dualtron-compact",
      imageURL: null,
      specs: { maxSpeed: 60, range: 60, battery: "1036 Wh", motor: "1800W", weight: 25 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "dualtron-thunder2",
      brandId: BRAND_IDS.dualtron,
      name: "Dualtron Thunder 2",
      slug: "dualtron-thunder-2",
      imageURL: null,
      specs: { maxSpeed: 100, range: 150, battery: "2700 Wh", motor: "5400W", weight: 47 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "dualtron-victor",
      brandId: BRAND_IDS.dualtron,
      name: "Dualtron Victor Luxury",
      slug: "dualtron-victor-luxury",
      imageURL: null,
      specs: { maxSpeed: 80, range: 100, battery: "2268 Wh", motor: "4000W", weight: 38 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    // Kaabo
    {
      id: "kaabo-mantis10",
      brandId: BRAND_IDS.kaabo,
      name: "Kaabo Mantis 10 Lite",
      slug: "kaabo-mantis-10-lite",
      imageURL: null,
      specs: { maxSpeed: 48, range: 50, battery: "748 Wh", motor: "1000W", weight: 22 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "kaabo-mantisking",
      brandId: BRAND_IDS.kaabo,
      name: "Kaabo Mantis King GT",
      slug: "kaabo-mantis-king-gt",
      imageURL: null,
      specs: { maxSpeed: 70, range: 100, battery: "1512 Wh", motor: "2000W", weight: 33 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "kaabo-wolfwarrior",
      brandId: BRAND_IDS.kaabo,
      name: "Kaabo Wolf Warrior 11+",
      slug: "kaabo-wolf-warrior-11-plus",
      imageURL: null,
      specs: { maxSpeed: 80, range: 110, battery: "1680 Wh", motor: "5400W", weight: 46 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    // VSETT
    {
      id: "vsett-8",
      brandId: BRAND_IDS.vsett,
      name: "VSETT 8",
      slug: "vsett-8",
      imageURL: null,
      specs: { maxSpeed: 40, range: 50, battery: "748 Wh", motor: "800W", weight: 18 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "vsett-9plus",
      brandId: BRAND_IDS.vsett,
      name: "VSETT 9+",
      slug: "vsett-9-plus",
      imageURL: null,
      specs: { maxSpeed: 52, range: 60, battery: "840 Wh", motor: "1400W", weight: 23 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "vsett-10plus",
      brandId: BRAND_IDS.vsett,
      name: "VSETT 10+",
      slug: "vsett-10-plus",
      imageURL: null,
      specs: { maxSpeed: 65, range: 90, battery: "1560 Wh", motor: "2800W", weight: 34 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    // Zero
    {
      id: "zero-8",
      brandId: BRAND_IDS.zero,
      name: "Zero 8",
      slug: "zero-8",
      imageURL: null,
      specs: { maxSpeed: 40, range: 35, battery: "499 Wh", motor: "500W", weight: 16 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "zero-10x",
      brandId: BRAND_IDS.zero,
      name: "Zero 10X",
      slug: "zero-10x",
      imageURL: null,
      specs: { maxSpeed: 65, range: 80, battery: "1560 Wh", motor: "2400W", weight: 35 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "zero-11x",
      brandId: BRAND_IDS.zero,
      name: "Zero 11X",
      slug: "zero-11x",
      imageURL: null,
      specs: { maxSpeed: 100, range: 120, battery: "2700 Wh", motor: "5600W", weight: 46 },
      compatibleServices: ALL_SERVICES,
      isActive: true,
      createdAt: now,
    },
    // Inokim (limited firmware support)
    {
      id: "inokim-light2",
      brandId: BRAND_IDS.inokim,
      name: "Inokim Light 2",
      slug: "inokim-light-2",
      imageURL: null,
      specs: { maxSpeed: 35, range: 30, battery: "374 Wh", motor: "350W", weight: 13.6 },
      compatibleServices: INOKIM_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "inokim-ox",
      brandId: BRAND_IDS.inokim,
      name: "Inokim OX",
      slug: "inokim-ox",
      imageURL: null,
      specs: { maxSpeed: 45, range: 60, battery: "720 Wh", motor: "800W", weight: 20.5 },
      compatibleServices: INOKIM_SERVICES,
      isActive: true,
      createdAt: now,
    },
    {
      id: "inokim-oxo",
      brandId: BRAND_IDS.inokim,
      name: "Inokim OXO",
      slug: "inokim-oxo",
      imageURL: null,
      specs: { maxSpeed: 65, range: 100, battery: "1440 Wh", motor: "2600W", weight: 33 },
      compatibleServices: INOKIM_SERVICES,
      isActive: true,
      createdAt: now,
    },
  ]

  for (const model of models) {
    const { id, ...data } = model
    await db
      .collection("scooterModels")
      .doc(id)
      .set({
        ...data,
        searchTokens: buildSearchTokens(
          data.name,
          data.slug,
          BRAND_NAMES_BY_ID[data.brandId],
          ...data.compatibleServices.map((serviceId) => SERVICE_NAMES_BY_ID[serviceId])
        ),
      })
    console.log(`  ✅ ${model.name}`)
  }
}

async function seedDemoTechnicians() {
  console.log("👨‍🔧 Seeding demo technicians…")
  const technicians = [
    {
      id: "tech-demo-1",
      userId: "demo-user-1",
      displayName: "Carlos Rodríguez",
      bio: "Tecnico especializado en scooters Xiaomi, Navee y MiStyle con 4 anos de experiencia. Certificado en modificaciones de firmware y mantenimiento avanzado.",
      photoURL: "",
      phone: "+59899111001",
      whatsappNumber: "+59899111001",
      location: "Montevideo Centro",
      services: ALL_SERVICES,
      supportedBrands: [BRAND_IDS.xiaomi, BRAND_IDS.navee, BRAND_IDS.mistyle],
      availability: {
        monday: { start: "09:00", end: "18:00", isAvailable: true },
        tuesday: { start: "09:00", end: "18:00", isAvailable: true },
        wednesday: { start: "09:00", end: "18:00", isAvailable: true },
        thursday: { start: "09:00", end: "18:00", isAvailable: true },
        friday: { start: "09:00", end: "17:00", isAvailable: true },
        saturday: { start: "10:00", end: "14:00", isAvailable: true },
        sunday: { start: "00:00", end: "00:00", isAvailable: false },
      },
      pricing: {
        [SERVICE_IDS.speedLimit]: { basePrice: 1800, currency: "UYU" },
        [SERVICE_IDS.firmware]: { basePrice: 1200, currency: "UYU" },
        [SERVICE_IDS.cruiseControl]: { basePrice: 1500, currency: "UYU" },
        [SERVICE_IDS.maintenance]: { basePrice: 1000, currency: "UYU" },
      },
      rating: 4.8,
      reviewCount: 32,
      isApproved: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "tech-demo-2",
      userId: "demo-user-2",
      displayName: "Valentina Suárez",
      bio: "Especialista en scooters Joyor, Atom y equipos de alto rendimiento. Trabajo a domicilio en todo Montevideo.",
      photoURL: "",
      phone: "+59899111002",
      whatsappNumber: "+59899111002",
      location: "Pocitos, Montevideo",
      services: ALL_SERVICES,
      supportedBrands: [BRAND_IDS.joyor, BRAND_IDS.atom, BRAND_IDS.dualtron, BRAND_IDS.kaabo],
      availability: {
        monday: { start: "10:00", end: "19:00", isAvailable: true },
        tuesday: { start: "10:00", end: "19:00", isAvailable: true },
        wednesday: { start: "00:00", end: "00:00", isAvailable: false },
        thursday: { start: "10:00", end: "19:00", isAvailable: true },
        friday: { start: "10:00", end: "19:00", isAvailable: true },
        saturday: { start: "09:00", end: "16:00", isAvailable: true },
        sunday: { start: "00:00", end: "00:00", isAvailable: false },
      },
      pricing: {
        [SERVICE_IDS.speedLimit]: { basePrice: 2500, currency: "UYU" },
        [SERVICE_IDS.firmware]: { basePrice: 2000, currency: "UYU" },
        [SERVICE_IDS.cruiseControl]: { basePrice: 2200, currency: "UYU" },
        [SERVICE_IDS.maintenance]: { basePrice: 1500, currency: "UYU" },
      },
      rating: 4.6,
      reviewCount: 18,
      isApproved: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "tech-demo-3",
      userId: "demo-user-3",
      displayName: "Mateo Fernández",
      bio: "Técnico generalista con experiencia en todas las marcas. Precios accesibles y servicio rápido. Atención en taller en Malvín.",
      photoURL: "",
      phone: "+59899111003",
      whatsappNumber: "+59899111003",
      location: "Malvín, Montevideo",
      services: [SERVICE_IDS.maintenance, SERVICE_IDS.firmware],
      supportedBrands: Object.values(BRAND_IDS),
      availability: {
        monday: { start: "08:00", end: "17:00", isAvailable: true },
        tuesday: { start: "08:00", end: "17:00", isAvailable: true },
        wednesday: { start: "08:00", end: "17:00", isAvailable: true },
        thursday: { start: "08:00", end: "17:00", isAvailable: true },
        friday: { start: "08:00", end: "17:00", isAvailable: true },
        saturday: { start: "00:00", end: "00:00", isAvailable: false },
        sunday: { start: "00:00", end: "00:00", isAvailable: false },
      },
      pricing: {
        [SERVICE_IDS.firmware]: { basePrice: 900, currency: "UYU" },
        [SERVICE_IDS.maintenance]: { basePrice: 800, currency: "UYU" },
      },
      rating: 4.4,
      reviewCount: 9,
      isApproved: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ]

  for (const tech of technicians) {
    const { id, ...data } = tech
    await db
      .collection("technicians")
      .doc(id)
      .set({
        ...data,
        normalizedLocation: normalizeSearchText(data.location),
        searchTokens: buildSearchTokens(
          data.displayName,
          data.bio,
          data.location,
          ...data.services.map((serviceId) => SERVICE_NAMES_BY_ID[serviceId]),
          ...data.supportedBrands.map((brandId) => BRAND_NAMES_BY_ID[brandId])
        ),
      })
    console.log(`  ✅ ${tech.displayName}`)
  }
}

async function main() {
  console.log("🌱 Starting ScooterBooster seed…\n")
  await seedServices()
  await seedBrands()
  await seedModels()
  await seedDemoTechnicians()
  console.log("\n✅ Seed complete!")
  process.exit(0)
}

main().catch((err) => {
  console.error("❌ Seed failed:", err)
  process.exit(1)
})
