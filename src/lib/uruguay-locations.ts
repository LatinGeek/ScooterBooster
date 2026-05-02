export interface UruguayLocationPreset {
  slug: string
  label: string
  latitude: number
  longitude: number
  aliases: string[]
}

export const URUGUAY_LOCATION_PRESETS: UruguayLocationPreset[] = [
  {
    slug: "montevideo-centro",
    label: "Montevideo Centro",
    latitude: -34.9055,
    longitude: -56.1913,
    aliases: ["montevideo", "centro", "montevideo centro"],
  },
  {
    slug: "pocitos",
    label: "Pocitos",
    latitude: -34.9167,
    longitude: -56.1497,
    aliases: ["pocitos", "pocitos montevideo"],
  },
  {
    slug: "malvin",
    label: "Malvin",
    latitude: -34.8858,
    longitude: -56.1367,
    aliases: ["malvin", "malvin montevideo"],
  },
  {
    slug: "punta-del-este",
    label: "Punta del Este",
    latitude: -34.968,
    longitude: -54.9481,
    aliases: ["punta del este", "punta"],
  },
  {
    slug: "maldonado",
    label: "Maldonado",
    latitude: -34.9082,
    longitude: -54.9581,
    aliases: ["maldonado"],
  },
  {
    slug: "colonia",
    label: "Colonia del Sacramento",
    latitude: -34.4714,
    longitude: -57.8442,
    aliases: ["colonia", "colonia del sacramento"],
  },
]

function normalizeLocationText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

export function getPresetBySlug(slug: string): UruguayLocationPreset | null {
  return URUGUAY_LOCATION_PRESETS.find((preset) => preset.slug === slug) ?? null
}

export function matchUruguayLocation(text: string): UruguayLocationPreset | null {
  const normalizedText = normalizeLocationText(text)
  if (!normalizedText) return null

  let bestMatch: UruguayLocationPreset | null = null
  let bestAliasLength = -1

  for (const preset of URUGUAY_LOCATION_PRESETS) {
    for (const alias of preset.aliases) {
      const normalizedAlias = normalizeLocationText(alias)
      if (!normalizedText.includes(normalizedAlias)) continue

      if (normalizedAlias.length > bestAliasLength) {
        bestMatch = preset
        bestAliasLength = normalizedAlias.length
      }
    }
  }

  return bestMatch
}

export function getCoordinatesFromPreset(
  preset: UruguayLocationPreset
): { lat: number; lng: number } {
  return {
    lat: preset.latitude,
    lng: preset.longitude,
  }
}

export function getCoordinatesForLocation(
  location: string
): { lat: number; lng: number } | null {
  const preset = matchUruguayLocation(location)
  return preset ? getCoordinatesFromPreset(preset) : null
}

export function haversineDistanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
): number {
  const earthRadiusKm = 6371
  const toRadians = (value: number) => (value * Math.PI) / 180

  const latitudeDelta = toRadians(latitudeB - latitudeA)
  const longitudeDelta = toRadians(longitudeB - longitudeA)
  const startLatitude = toRadians(latitudeA)
  const endLatitude = toRadians(latitudeB)

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
