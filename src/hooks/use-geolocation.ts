"use client"

import { useState } from "react"

const SESSION_STORAGE_KEY = "sb:booking-user-location"

interface Coordinates {
  lat: number
  lng: number
}

interface GeolocationState {
  lat: number | null
  lng: number | null
  loading: boolean
  error: string | null
  request: () => Promise<Coordinates | null>
}

function readStoredCoordinates(): Coordinates | null {
  if (typeof window === "undefined") return null

  const rawValue = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!rawValue) return null

  try {
    const parsed = JSON.parse(rawValue) as Partial<Coordinates>
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
      return parsed as Coordinates
    }
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
  }

  return null
}

export function useGeolocation(): GeolocationState {
  const storedCoordinates = readStoredCoordinates()
  const [coordinates, setCoordinates] = useState<Coordinates | null>(storedCoordinates)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function request(): Promise<Coordinates | null> {
    if (coordinates) {
      setError(null)
      return coordinates
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Tu navegador no permite usar ubicacion en este momento.")
      return null
    }

    setLoading(true)
    setError(null)

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextCoordinates = {
            lat: Number(position.coords.latitude.toFixed(5)),
            lng: Number(position.coords.longitude.toFixed(5)),
          }

          setCoordinates(nextCoordinates)
          window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextCoordinates))
          setLoading(false)
          resolve(nextCoordinates)
        },
        () => {
          setError("No pudimos acceder a tu ubicacion.")
          setLoading(false)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
      )
    })
  }

  return {
    lat: coordinates?.lat ?? null,
    lng: coordinates?.lng ?? null,
    loading,
    error,
    request,
  }
}
