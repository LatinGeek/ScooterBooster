"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase"
import type { User } from "@/types"

const googleProvider = new GoogleAuthProvider()

interface AuthContextValue {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  role: "user" | "technician" | "admin" | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

declare global {
  interface Window {
    __scooterboosterE2EAuth?: {
      signInWithCustomToken: (token: string) => Promise<void>
      signOut: () => Promise<void>
    }
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

function buildFallbackUser(fbUser: FirebaseUser, role: User["role"]): User {
  const now = new Date().toISOString()
  return {
    uid: fbUser.uid,
    displayName: fbUser.displayName ?? "",
    email: fbUser.email ?? "",
    photoURL: fbUser.photoURL ?? null,
    role,
    phone: null,
    whatsappConsent: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<"user" | "technician" | "admin" | null>(null)
  const hadAuthenticatedSession = useRef(false)
  const syncPromiseRef = useRef<Promise<void> | null>(null)

  const syncAuthenticatedUser = useCallback(async (fbUser: FirebaseUser) => {
    if (syncPromiseRef.current) {
      await syncPromiseRef.current
      return
    }

    syncPromiseRef.current = (async () => {
      const db = getFirebaseDb()
      const idTokenResult = await fbUser.getIdTokenResult()
      const claimedRole =
        (idTokenResult.claims["role"] as "user" | "technician" | "admin" | undefined) ?? "user"
      const fallbackUser = buildFallbackUser(fbUser, claimedRole)

      setFirebaseUser(fbUser)
      setRole(claimedRole)
      setUser((current) =>
        current?.uid === fbUser.uid ? { ...fallbackUser, ...current } : fallbackUser
      )

      const userRef = doc(db, "users", fbUser.uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        setUser({
          uid: fbUser.uid,
          ...(userSnap.data() as Omit<User, "uid">),
        })
      } else {
        const newUser = buildFallbackUser(fbUser, "user")
        await setDoc(userRef, {
          displayName: newUser.displayName,
          email: newUser.email,
          photoURL: newUser.photoURL,
          role: newUser.role,
          phone: newUser.phone,
          whatsappConsent: newUser.whatsappConsent,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
        })
        setUser(newUser)
      }

      const idToken = await fbUser.getIdToken()
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        throw new Error("No se pudo sincronizar la sesión del servidor.")
      }
    })()

    try {
      await syncPromiseRef.current
    } finally {
      syncPromiseRef.current = null
    }
  }, [])

  useEffect(() => {
    const auth = getFirebaseAuth()

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true)

      if (fbUser) {
        hadAuthenticatedSession.current = true
        try {
          await syncAuthenticatedUser(fbUser)
        } catch (error) {
          console.error(error)
        } finally {
          setLoading(false)
        }
        return
      }

      setFirebaseUser(null)
      setUser(null)
      setRole(null)

      if (hadAuthenticatedSession.current) {
        await fetch("/api/auth/signout", { method: "POST" })
        hadAuthenticatedSession.current = false
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [syncAuthenticatedUser])

  const signInWithGoogle = useCallback(async () => {
    setLoading(true)
    try {
      const result = await signInWithPopup(getFirebaseAuth(), googleProvider)
      hadAuthenticatedSession.current = true
      await syncAuthenticatedUser(result.user)
    } finally {
      setLoading(false)
    }
  }, [syncAuthenticatedUser])

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth())
  }, [])

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_AUTH !== "enabled") return

    window.__scooterboosterE2EAuth = {
      signInWithCustomToken: async (token: string) => {
        await signInWithCustomToken(getFirebaseAuth(), token)
      },
      signOut: async () => {
        await firebaseSignOut(getFirebaseAuth())
      },
    }

    return () => {
      delete window.__scooterboosterE2EAuth
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, role, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>")
  }
  return ctx
}
