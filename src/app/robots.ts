import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/scooters", "/services", "/technicians"],
        disallow: ["/dashboard", "/admin", "/api", "/onboarding"],
      },
    ],
    sitemap: "https://scooterbooster.uy/sitemap.xml",
  }
}
