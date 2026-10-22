import { calculatePricing } from "@/lib/pricing"
import { deriveLegacyFieldsFromMatrix } from "@/lib/technician-matrix"
import type { ScooterModel, Technician } from "@/types"

export const SEGWAY_TECHNICIAN_ID = "JywDyQgAUNN1vn0rryxjbxamumJ2"
export const SEGWAY_BOOKING_FEE = 150
export const SEGWAY_SERVICE_PRICES: Record<string, number> = {
  "speed-limit": 2850,
  maintenance: 1800,
}

interface SegwayCatalogEntry {
  model: Omit<ScooterModel, "createdAt">
  description: string
  sourceURL: string
  sourceImageURL: string
}

const definitions = [
  {
    key: "e3-pro",
    name: "Segway E3 Pro",
    description:
      "Mantenimiento y deslimitación para tu Segway E3 Pro en Uruguay. Reservá atención para tu monopatín de uso diario.",
    specs: { maxSpeed: 25, range: 55, battery: "Consultar", motor: "400 W", weight: 15 },
    image: "/models/e3-pro/e3-pro-hero-1.png",
  },
  {
    key: "f3",
    name: "Segway F3",
    description:
      "Mantenimiento y deslimitación para tu Segway F3 en Uruguay. Coordiná la revisión de tu monopatín con doble suspensión, pensado para trayectos largos.",
    specs: { maxSpeed: 32, range: 70, battery: "Consultar", motor: "450 W", weight: 17.5 },
    image: "/models/f3/f3-cutout.png",
  },
  {
    key: "zt3-pro",
    name: "Segway ZT3 Pro",
    description:
      "Mantenimiento y deslimitación para tu Segway ZT3 Pro en Uruguay. Agendá atención para tu monopatín con suspensión y neumáticos todoterreno de 11 pulgadas.",
    specs: { maxSpeed: 40, range: 70, battery: "Consultar", motor: "450 W", weight: 28.5 },
    image: "/models/zt3-pro/zt3-cutout.png",
  },
]

export const SEGWAY_CATALOG: SegwayCatalogEntry[] = definitions.map((entry) => ({
  model: {
    id: `segway-${entry.key}`,
    brandId: "brand-segway",
    name: entry.name,
    slug: `segway-ninebot-${entry.key}`,
    imageURL: `/assets/scooter-model-images/segway-${entry.key}.png`,
    specs: entry.specs,
    compatibleServices: Object.keys(SEGWAY_SERVICE_PRICES),
    bookingFeeAmount: SEGWAY_BOOKING_FEE,
    isActive: true,
    searchTokens: ["segway", "ninebot", ...entry.key.split("-"), "mantenimiento", "deslimitacion"],
  },
  description: entry.description,
  sourceURL: `https://www.segway.com.uy/productos/${entry.key}`,
  sourceImageURL: `https://www.segway.com.uy${entry.image}`,
}))

export function getSegwayContent(modelId: string) {
  return SEGWAY_CATALOG.find((entry) => entry.model.id === modelId)
}

export function getSegwayServiceDescription(serviceId: string) {
  if (serviceId === "speed-limit") {
    return "Deslimitación de velocidad para tu Segway. La velocidad final depende de la versión y el estado del equipo."
  }
  if (serviceId === "maintenance") {
    return "Diagnóstico, ajustes y revisión de seguridad para tu Segway, con la misma tarifa de mantenimiento que Xiaomi. Repuestos a cotizar por separado."
  }
  return undefined
}

export function getSegwayServicePricing(serviceId: string) {
  const basePrice = SEGWAY_SERVICE_PRICES[serviceId]
  return basePrice === undefined ? null : calculatePricing(basePrice, SEGWAY_BOOKING_FEE)
}

/** Add the six confirmed combinations without changing existing matrix entries. */
export function buildSegwayTechnicianUpdate(
  matrix: Technician["pricingMatrix"],
  modelBrandMap: Record<string, string>
) {
  const pricingMatrix = { ...matrix }
  for (const [serviceId, price] of Object.entries(SEGWAY_SERVICE_PRICES)) {
    pricingMatrix[serviceId] = { ...pricingMatrix[serviceId] }
    for (const { model } of SEGWAY_CATALOG) {
      pricingMatrix[serviceId][model.id] = { price, currency: "UYU", isAvailable: true }
    }
  }
  const brands = {
    ...modelBrandMap,
    ...Object.fromEntries(SEGWAY_CATALOG.map(({ model }) => [model.id, model.brandId])),
  }
  return { pricingMatrix, ...deriveLegacyFieldsFromMatrix(pricingMatrix, brands) }
}
