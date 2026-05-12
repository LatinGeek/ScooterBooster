import { HomePageClient } from "./home-page-client"

export default function HomePage() {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ScooterBooster",
    url: "https://scooterbooster.uy",
    logo: "https://scooterbooster.uy/icon.svg",
    sameAs: ["https://www.scooterbooster.uy"],
    areaServed: {
      "@type": "Country",
      name: "Uruguay",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "soporte@scooterbooster.uy",
      areaServed: "UY",
      availableLanguage: "es",
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <HomePageClient />
    </>
  )
}
