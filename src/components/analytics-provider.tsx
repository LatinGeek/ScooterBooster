"use client"

import { useEffect, useState } from "react"
import Script from "next/script"
import {
  COOKIE_PREFERENCES_EVENT,
  hasAnalyticsConsent,
  readCookiePreferences,
} from "@/lib/analytics"

interface Props {
  measurementId: string | null
}

export function AnalyticsProvider({ measurementId }: Props) {
  const [canTrack, setCanTrack] = useState(false)

  useEffect(() => {
    const sync = () => {
      setCanTrack(Boolean(measurementId) && hasAnalyticsConsent())
    }

    sync()

    const handlePreferenceChange = () => sync()
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.includes("sb-cookie")) sync()
    }

    window.addEventListener(COOKIE_PREFERENCES_EVENT, handlePreferenceChange)
    window.addEventListener("storage", handleStorage)
    return () => {
      window.removeEventListener(COOKIE_PREFERENCES_EVENT, handlePreferenceChange)
      window.removeEventListener("storage", handleStorage)
    }
  }, [measurementId])

  if (!measurementId || !canTrack) {
    return null
  }

  const preferences = readCookiePreferences()
  const analyticsStorage = preferences?.analytics ? "granted" : "denied"

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-base" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('consent', 'default', { analytics_storage: '${analyticsStorage}' });
          gtag('config', '${measurementId}', {
            anonymize_ip: true,
            allow_google_signals: false
          });
        `}
      </Script>
    </>
  )
}
