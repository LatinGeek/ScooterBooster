import type { MetadataRoute } from "next"
import { getActiveModels } from "@/lib/db/models"
import { getActiveTechnicians } from "@/lib/db/technicians"

const BASE_URL = "https://scooterbooster.uy"

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [models, technicians] = await Promise.all([
    getActiveModels(),
    getActiveTechnicians({ limit: 200 }),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    {
      url: `${BASE_URL}/scooters`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/services`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/technicians`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ]

  const scooterRoutes: MetadataRoute.Sitemap = models.map((m) => ({
      url: `${BASE_URL}/scooters/${m.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }))

  const technicianRoutes: MetadataRoute.Sitemap = technicians.map((t) => ({
    url: `${BASE_URL}/technicians/${t.slug}`,
    lastModified: new Date(t.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...scooterRoutes, ...technicianRoutes]
}
