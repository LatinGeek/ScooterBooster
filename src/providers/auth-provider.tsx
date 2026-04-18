"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
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

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<"user" | "technician" | "admin" | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const db = getFirebaseDb()

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser)

        // Get role from custom claims
        const idTokenResult = await fbUser.getIdTokenResult()
        const claimedRole = idTokenResult.claims["role"] as
          | "user"
          | "technician"
          | "admin"
          | undefined
        setRole(claimedRole ?? "user")

        // Sync/create Firestore user doc
        const userRef = doc(db, "users", fbUser.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          setUser({ uid: fbUser.uid, ...userSnap.data() } as unknown as User)
        } else {
          const newUser: Omit<User, "uid"> = {
            displayName: fbUser.displayName ?? "",
            email: fbUser.email ?? "",
            photoURL: fbUser.photoURL ?? null,
            role: "user",
            phone: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          await setDoc(userRef, newUser)
          setUser({ uid: fbUser.uid, ...newUser })
        }

        // Exchange ID token for a server-side session cookie
        const idToken = await fbUser.getIdToken()
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        })
      } else {
        setFirebaseUser(null)
        setUser(null)
        setRole(null)
        // Clear server session
        await fetch("/api/auth/signout", { method: "POST" })
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(getFirebaseAuth(), googleProvider)
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth())
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
